"""The engine runs in its own thread with an asyncio loop: follows the player, fetches lyrics and covers,
listens to the audio and keeps every connected page up to date. The shell (tray, Cinema, glow) talks
to it through a few thread-safe calls."""
from __future__ import annotations

import asyncio
import json
import logging
import os
import threading
import time
from typing import Any, Optional

from . import PORTS, __version__
from .audio import AudioAnalyzer, MockAudio, NullAudio
from . import custom
from .config import MODES, Settings
from .cover import CoverService
from .mask import MaskService, available as mask_available
from .lyrics import LyricsService
from .media import MediaState, MockMedia, NullMedia, WinMedia
from .paths import DATA_DIR, IS_WINDOWS, WEB_DIR
from .server import Server

log = logging.getLogger("oley.engine")
VIEW_ROLES = ("view", "cinema", "window", "wallpaper", "preview", "thumb")
SET_ROLES = ("settings",)


class HeadlessShell:
    """Used when there's no Qt (tests, or PySide6 missing): no tray, no glow, no Cinema windows."""

    def __init__(self) -> None:
        self.engine = None

    def attach(self, engine) -> None:
        self.engine = engine

    def call(self, name: str, *args) -> Any:
        log.debug("shell call (headless): %s", name)
        if name == "quit":
            self.engine.stop()
        if name == "open_settings":
            import webbrowser
            webbrowser.open(self.engine.url("settings.html"))
        return None

    def extra_state(self) -> dict:
        return {"cinema": {"on": False, "available": False}, "displays": [], "edge": False, "we": {"found": False}, "autostart": False, "shell": "headless"}


class Engine:
    def __init__(self, settings: Settings, mock: bool = False) -> None:
        self.settings = settings
        self.mock = mock
        self.loop = asyncio.new_event_loop()
        self.thread = threading.Thread(target=self._run, name="oley-engine", daemon=True)
        self.ready = threading.Event()
        self.stopped = threading.Event()
        self._stop: Optional[asyncio.Event] = None
        self.server = Server(self, WEB_DIR, settings.key)
        self.port = 0
        only = lambda: bool(self.settings.get("player.only_spotify", True))
        audio_on = lambda: bool(self.settings.get("audio.enabled", True))
        if mock:
            self.media = MockMedia(WEB_DIR)
            self.audio = MockAudio(audio_on)
        elif IS_WINDOWS:
            self.media = WinMedia(only)
            self.audio = AudioAnalyzer(audio_on)
        else:
            self.media = NullMedia()
            self.audio = NullAudio()
        self.lyrics_svc = LyricsService()
        self.covers = CoverService()
        self.shell = HeadlessShell()
        self.shell.attach(self)
        self.mstate: MediaState = MediaState()
        self.track: Optional[dict] = None
        self.lyrics: dict = {"status": "none", "synced": False, "lines": []}
        self.art: Optional[dict] = None
        self.masks = MaskService()
        self.mask: Optional[dict] = None
        self._want_masks = False
        self._mask_task = None
        self._lyr_task = None
        self._cov_task = None
        self._last_clock = None
        self._beat_seen = 0
        self._state_pending = False
        self.started_at = time.time()

    # ---------------------------------------------------------------- lifecycle
    def set_shell(self, shell) -> None:
        self.shell = shell
        shell.attach(self)

    def start(self) -> None:
        self.thread.start()
        if not self.ready.wait(15):
            raise RuntimeError("engine didn't start")
        if getattr(self, "_fatal", None):
            raise self._fatal

    def stop(self) -> None:
        if self._stop is not None and not self.loop.is_closed():
            self.loop.call_soon_threadsafe(self._stop.set)

    def join(self, timeout: float = 3.0) -> None:
        self.thread.join(timeout)

    def _run(self) -> None:
        asyncio.set_event_loop(self.loop)
        try:
            self.loop.run_until_complete(self._main())
        except Exception as e:
            log.exception("engine crashed")
            self._fatal = e
            self.ready.set()
        finally:
            self.stopped.set()

    async def _main(self) -> None:
        self._stop = asyncio.Event()
        self.port = await self.server.start(PORTS)
        self._write_instance()
        try:
            self.audio.start()
        except Exception as e:
            log.warning("audio didn't start: %s", e)
        tasks = [
            asyncio.ensure_future(self.media.run(self._on_media, self._stop)),
            asyncio.ensure_future(self._clock_task()),
            asyncio.ensure_future(self._audio_task()),
        ]
        self.ready.set()
        await self._stop.wait()
        for t in tasks:
            t.cancel()
        try:
            self.audio.stop()
        except Exception:
            pass
        await self.server.stop()
        try:
            os.remove(DATA_DIR / "instance.json")
        except OSError:
            pass

    def _write_instance(self) -> None:
        try:
            (DATA_DIR / "instance.json").write_text(json.dumps({
                "port": self.port, "key": self.settings.key, "pid": os.getpid(), "version": __version__, "started": time.time(),
            }), encoding="utf-8")
        except OSError as e:
            log.warning("couldn't write instance file: %s", e)

    # ---------------------------------------------------------------- thread-safe entry points (from the shell)
    def submit(self, coro):
        return asyncio.run_coroutine_threadsafe(coro, self.loop)

    def action(self, name: str, arg=None) -> None:
        self.submit(self._action(name, arg, None))

    def set(self, key: str, value) -> None:
        self.submit(self._set(key, value))

    def send_cmd(self, cmd: str, screen: str | None = None, arg=None, roles=("cinema",)) -> None:
        self.submit(self.server.broadcast({"type": "cmd", "cmd": cmd, "screen": screen, "arg": arg}, roles=roles))

    def state_changed(self) -> None:
        if not self.loop.is_closed():
            self.loop.call_soon_threadsafe(self._push_state)

    def url(self, page: str, **q) -> str:
        from urllib.parse import urlencode
        q = {"k": self.settings.key, **{k: v for k, v in q.items() if v is not None}}
        return f"http://127.0.0.1:{self.port}/{page}?{urlencode(q)}"

    def audio_now(self) -> dict:
        return self.audio.latest if getattr(self.audio, "ok", False) else {}

    @property
    def playing(self) -> bool:
        return bool(self.track and self.mstate.playing)

    # ---------------------------------------------------------------- media
    async def _on_media(self, st: MediaState) -> None:
        prev = self.mstate
        self.mstate = st
        if not st.has_session or not st.title:
            if self.track is not None:
                self.track = None
                self.art = None
                self.lyrics = {"status": "none", "synced": False, "lines": []}
                await self.server.broadcast({"type": "track", "track": None})
                self._shell("on_track", None, None)
                self._push_state()
            return
        tid = st.track_id
        if self.track is None or self.track["id"] != tid:
            await self._new_track(st, tid)
        elif st.duration and abs(st.duration - self.track.get("duration", 0)) > 1:
            self.track["duration"] = st.duration
            await self.server.broadcast({"type": "track", "track": self.track})
        # clock: send when playing state flips or the position jumps (seek)
        if prev.playing != st.playing or (self._last_clock and abs(self._expected_pos() - st.pos_now()) > 0.8):
            await self._send_clock()
            self._push_state()

    def _expected_pos(self) -> float:
        pos, playing, at = self._last_clock
        return pos + ((time.time() - at) if playing else 0)

    async def _new_track(self, st: MediaState, tid: str) -> None:
        log.info("now playing: %s - %s (%s)", st.artist, st.title, st.app)
        self.art = {"id": tid + "t", "bytes": st.thumbnail} if st.thumbnail else None
        self.track = {
            "id": tid, "title": st.title, "artist": st.artist, "album": st.album, "duration": round(st.duration, 2),
            "app": st.app, "art": self._art_url(),
        }
        self.lyrics = {"id": tid, "status": "loading", "synced": False, "lines": []}
        await self.server.broadcast({"type": "track", "track": self.track})
        await self.server.broadcast({"type": "lyrics", "lyrics": self.lyrics})
        await self._send_clock()
        self._shell("on_track", self.track, self.art["bytes"] if self.art else None)
        self._push_state()
        for t in (self._lyr_task, self._cov_task):
            if t and not t.done():
                t.cancel()
        self._lyr_task = asyncio.ensure_future(self._fetch_lyrics(dict(self.track)))
        self.mask = None
        if self._want_masks:
            self._schedule_mask(2.5)
        if self.settings.get("player.hd_covers", True) and not self.mock:
            self._cov_task = asyncio.ensure_future(self._fetch_cover(dict(self.track)))

    def _art_url(self) -> Optional[str]:
        if not self.art:
            return None
        return f"http://127.0.0.1:{self.port}/art/{self.art['id']}.jpg"

    async def _fetch_lyrics(self, tr: dict, force: bool = False) -> None:
        loop = asyncio.get_running_loop()
        if self.mock:
            from .lyrics import parse_lrc
            demo = (WEB_DIR / "js" / "core.js").read_text(encoding="utf-8")
            import re
            lrc = "\n".join(m.group(1).replace("\\'", "'") for m in re.finditer(r"'(\[\d\d:\d\d\.\d\d\][^']*(?:\\'[^']*)*)'", demo))
            res = {"status": "synced", "synced": True, "lines": parse_lrc(lrc), "source": "demo"}
        else:
            res = await loop.run_in_executor(None, lambda: self.lyrics_svc.fetch(tr["artist"], tr["title"], tr.get("album", ""), tr.get("duration", 0), force))
        if not self.track or self.track["id"] != tr["id"]:
            return
        res = dict(res)
        res["id"] = tr["id"]
        res.pop("at", None)
        self.lyrics = res
        log.info("lyrics: %s (%s, %d lines)", res.get("status"), res.get("source"), len(res.get("lines") or []))
        await self.server.broadcast({"type": "lyrics", "lyrics": res})
        self._push_state()
        if res.get("status") == "error":
            await asyncio.sleep(20)
            if self.track and self.track["id"] == tr["id"]:
                await self._fetch_lyrics(tr)

    async def _fetch_cover(self, tr: dict) -> None:
        loop = asyncio.get_running_loop()
        data = await loop.run_in_executor(None, lambda: self.covers.find(tr["artist"], tr["title"], tr.get("album", "")))
        if not data or not self.track or self.track["id"] != tr["id"]:
            return
        self.art = {"id": tr["id"] + "h", "bytes": data}
        self.track["art"] = self._art_url()
        await self.server.broadcast({"type": "track", "track": self.track})
        if self._want_masks:
            self._schedule_mask(0)
        self._shell("on_track", self.track, data)
        self._push_state()

    # ---------------------------------------------------------------- subject cut-outs (edit modes)
    def _schedule_mask(self, delay: float) -> None:
        if self._mask_task and not self._mask_task.done():
            self._mask_task.cancel()
        self._mask_task = asyncio.ensure_future(self._make_mask(delay))

    def _mask_msg(self) -> Optional[dict]:
        if not (self.mask and self.art and self.mask["for"] == self.art["id"]):
            return None
        return {"type": "mask", "art": self._art_url(), "url": f"http://127.0.0.1:{self.port}/mask/{self.mask['id']}.png"}

    async def _make_mask(self, delay: float) -> None:
        if delay:
            await asyncio.sleep(delay)
        if not self.settings.get("player.cutouts", True) or self.mock or not self.art or not mask_available():
            return
        art = self.art
        if not (self.mask and self.mask["for"] == art["id"]):
            loop = asyncio.get_running_loop()
            png = await loop.run_in_executor(None, lambda: self.masks.make(art["bytes"]))
            if not png or self.art is not art:
                return
            self.mask = {"id": art["id"] + "m", "for": art["id"], "bytes": png}
        msg = self._mask_msg()
        if msg:
            await self.server.broadcast(msg)

    async def _send_clock(self, roles=None) -> None:
        st = self.mstate
        if not self.track:
            return
        pos = st.pos_now()
        self._last_clock = (pos, st.playing, time.time())
        await self.server.broadcast({"type": "clock", "pos": round(pos, 3), "playing": st.playing, "at": int(time.time() * 1000)}, roles=roles)

    async def _clock_task(self) -> None:
        n = 0
        while True:
            await asyncio.sleep(0.25)
            n += 1
            if self.track and (self.mstate.playing or n % 4 == 0):
                await self._send_clock()

    async def _audio_task(self) -> None:
        while True:
            await asyncio.sleep(1 / 30)
            if not (getattr(self.audio, "ok", False) and self.settings.get("audio.enabled", True) and self.playing):
                continue
            if not self.server.count(VIEW_ROLES):
                continue
            a = dict(self.audio.latest)
            bid = a.get("beat", 0)
            a["beat"] = 1 if bid and bid != self._beat_seen else 0
            if bid:
                self._beat_seen = bid
            await self.server.broadcast({"type": "audio", "a": a}, roles=VIEW_ROLES, droppable=True)

    # ---------------------------------------------------------------- connections
    async def on_connect(self, c) -> None:
        hello: dict[str, Any] = {"type": "hello", "version": __version__, "role": c.role, "screen": c.screen, "settings": self.settings.render()}
        if c.role == "cinema":
            m = (self.settings.get("cinema.screens", {}) or {}).get(c.screen, {}).get("mode", "auto")
            hello["mode"] = None if m in (None, "", "auto") else m
        elif c.role == "wallpaper":
            m = self.settings.get("wallpaper.mode", "auto")
            hello["mode"] = None if m in (None, "", "auto") else m
        if c.role in SET_ROLES:
            hello["state"] = self.ui_state()
        await c.send(json.dumps(hello))
        await c.send(json.dumps({"type": "track", "track": self.track}))
        if self.track:
            await c.send(json.dumps({"type": "lyrics", "lyrics": self.lyrics}))
            st = self.mstate
            await c.send(json.dumps({"type": "clock", "pos": round(st.pos_now(), 3), "playing": st.playing, "at": int(time.time() * 1000)}))
            mm = self._mask_msg()
            if mm:
                await c.send(json.dumps(mm))
        if c.role == "settings":
            self._shell("settings_connected")
        if c.role == "cinema":
            self._shell("cinema_connected", c.screen)

    async def on_disconnect(self, c) -> None:
        if c.role == "settings" and not self.server.count(SET_ROLES):
            self._shell("settings_disconnected")

    async def on_message(self, c, msg: dict) -> None:
        t = msg.get("type")
        if t == "action":
            await self._action(str(msg.get("name", "")), msg.get("arg"), c)
        elif t == "set":
            await self._set(str(msg.get("key", "")), msg.get("value"))
        elif t == "input" and c.role == "cinema":
            self._shell("cinema_input", c.screen, msg.get("kind", ""))
        elif t == "log":
            log.warning("[page %s] %s", c.role, str(msg.get("msg", ""))[:1500])
        elif t == "want" and msg.get("what") == "mask":
            self._want_masks = True
            self._schedule_mask(0)

    async def api(self, name: str, q: dict, payload: dict) -> dict:
        if name == "hello":
            return {"app": "oley", "version": __version__, "pid": os.getpid()}
        if name == "show":
            self._shell("open_settings")
            return {"ok": True}
        if name == "quit":
            self._shell("quit")
            return {"ok": True}
        if name == "state":
            return self.ui_state()
        if name == "mock" and self.mock and "t" in q:
            await self.media.control("seek", float(q["t"]))
            return {"ok": True}
        if name == "action":
            await self._action(str(payload.get("name", "")), payload.get("arg"), None)
            return {"ok": True}
        return {"error": "unknown"}

    # ---------------------------------------------------------------- actions & settings
    async def _action(self, name: str, arg, client) -> None:
        log.info("action %s %s", name, "" if arg is None else arg)
        if name in ("play_pause", "next", "prev", "seek"):
            await self.media.control(name, arg)
            return
        if name == "lyrics_reload" and self.track:
            self.lyrics = {"id": self.track["id"], "status": "loading", "synced": False, "lines": []}
            await self.server.broadcast({"type": "lyrics", "lyrics": self.lyrics})
            if self._lyr_task and not self._lyr_task.done():
                self._lyr_task.cancel()
            self._lyr_task = asyncio.ensure_future(self._fetch_lyrics(dict(self.track), force=True))
            return
        if name == "reload_views":
            await self.server.broadcast({"type": "cmd", "cmd": "reload"}, roles=VIEW_ROLES)
            return
        # everything else is the shell's (Cinema, windows, Wallpaper Engine, quit…)
        self._shell(name, arg)

    async def _set(self, key: str, value) -> None:
        if not key or key == "key":
            return
        if key == "offset":
            try:
                value = max(-5.0, min(5.0, float(value)))
            except (TypeError, ValueError):
                return
        if key == "mode" and value not in (["auto"] + MODES + custom.names(MODES)):
            return
        changed = self.settings.set(key, value)
        if not changed:
            return
        top = key.split(".")[0]
        if top in ("mode", "enabled", "intro", "clock", "offset", "perf", "glow", "opts"):
            await self.server.broadcast({"type": "settings", "settings": self.settings.render()}, roles=VIEW_ROLES)
        if key.startswith("cinema.screens"):
            for sid, conf in (self.settings.get("cinema.screens", {}) or {}).items():
                m = conf.get("mode", "auto")
                await self.server.broadcast({"type": "cmd", "cmd": "mode", "screen": sid, "arg": None if m == "auto" else m}, roles=("cinema",))
        if key == "wallpaper.mode":
            await self.server.broadcast({"type": "cmd", "cmd": "mode", "arg": None if value == "auto" else value}, roles=("wallpaper",))
        if key == "player.only_spotify":
            self.mstate = MediaState()
        self._shell("on_setting", key, value)
        self._push_state()

    # ---------------------------------------------------------------- settings page state
    def ui_state(self) -> dict:
        st = self.mstate
        extra = {}
        try:
            extra = self.shell.extra_state() or {}
        except Exception as e:
            log.debug("extra_state failed: %s", e)
        lyr = self.lyrics or {}
        return {
            "version": __version__,
            "settings": self.settings.public(),
            "modes": MODES,
            "custom": custom.scan(MODES),
            "port": self.port,
            "media": {
                "ok": bool(getattr(self.media, "ok", False)), "error": getattr(self.media, "error", ""),
                "track": self.track, "playing": st.playing, "pos": round(st.pos_now(), 2), "estimated": st.estimated, "app": st.app,
            },
            "lyrics": {"status": lyr.get("status", "none"), "source": lyr.get("source", ""), "synced": lyr.get("synced", False), "lines": len(lyr.get("lines") or [])},
            "audio": {"ok": bool(getattr(self.audio, "ok", False)), "error": getattr(self.audio, "error", ""), "device": getattr(self.audio, "device", "")},
            "data_dir": str(DATA_DIR),
            **extra,
        }

    def _push_state(self) -> None:
        if self._state_pending:
            return
        self._state_pending = True

        async def go():
            await asyncio.sleep(0.12)
            self._state_pending = False
            if self.server.count(SET_ROLES):
                await self.server.broadcast({"type": "state", "state": self.ui_state()}, roles=SET_ROLES)
        asyncio.ensure_future(go())

    def _shell(self, name: str, *args) -> None:
        try:
            self.shell.call(name, *args)
        except Exception as e:
            log.warning("shell %s failed: %s", name, e)
