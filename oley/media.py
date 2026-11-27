"""What's playing, read from Windows' media controls (the same source as the volume flyout).
Spotify is preferred; other players can be allowed in settings. Also a stand-in player for testing."""
from __future__ import annotations

import asyncio
import datetime as _dt
import hashlib
import logging
import time
from dataclasses import dataclass, field
from typing import Awaitable, Callable, Optional

log = logging.getLogger("oley.media")


@dataclass
class MediaState:
    has_session: bool = False
    app: str = ""
    title: str = ""
    artist: str = ""
    album: str = ""
    duration: float = 0.0
    position: float = 0.0
    at: float = field(default_factory=time.time)   # wall time the position was true
    playing: bool = False
    thumbnail: Optional[bytes] = None
    estimated: bool = False

    @property
    def track_id(self) -> str:
        raw = f"{self.app}|{self.artist}|{self.title}|{self.album}".lower()
        return hashlib.sha1(raw.encode("utf-8", "replace")).hexdigest()[:16]

    def pos_now(self) -> float:
        p = self.position + (time.time() - self.at if self.playing else 0.0)
        return max(0.0, min(p, self.duration + 3 if self.duration > 0 else p))


def _seconds(v) -> float:
    if v is None:
        return 0.0
    if isinstance(v, _dt.timedelta):
        return v.total_seconds()
    if isinstance(v, (int, float)):
        return float(v) / 10_000_000.0 if abs(v) > 1e7 else float(v)
    d = getattr(v, "duration", None)
    if d is not None:
        return float(d) / 10_000_000.0
    try:
        return float(v)
    except Exception:
        return 0.0


def _epoch(v) -> Optional[float]:
    if isinstance(v, _dt.datetime):
        if v.year < 2001:
            return None
        if v.tzinfo is None:
            v = v.replace(tzinfo=_dt.timezone.utc)
        return v.timestamp()
    ut = getattr(v, "universal_time", None)
    if ut:
        # 100ns ticks since 1601-01-01
        return ut / 10_000_000.0 - 11644473600.0 if ut > 0 else None
    return None


def _import_winrt():
    try:
        from winrt.windows.media.control import GlobalSystemMediaTransportControlsSessionManager as MM  # type: ignore
        from winrt.windows.storage import streams  # type: ignore
        return MM, streams
    except ImportError:
        from winsdk.windows.media.control import GlobalSystemMediaTransportControlsSessionManager as MM  # type: ignore
        from winsdk.windows.storage import streams  # type: ignore
        return MM, streams


class WinMedia:
    """Polls the Windows media session manager from the engine's asyncio loop."""

    def __init__(self, only_spotify: Callable[[], bool]) -> None:
        self.only_spotify = only_spotify
        self.manager = None
        self.state = MediaState()
        self._key = None
        self._thumb: Optional[bytes] = None
        self._est = None          # (pos, at) when the player doesn't report a usable timestamp
        self._last_raw = None
        self.ok = False
        self.error = ""
        self._props_at = 0.0
        self._props = None

    async def run(self, on_change: Callable[[MediaState], Awaitable[None] | None], stop: asyncio.Event) -> None:
        try:
            MM, self.streams = _import_winrt()
        except Exception as e:
            self.error = "Windows media support is missing (winrt packages not installed)"
            log.error("%s: %s", self.error, e)
            return
        while not stop.is_set():
            try:
                if self.manager is None:
                    self.manager = await MM.request_async()
                    self.ok = True
                    self.error = ""
                st = await self.poll()
                r = on_change(st)
                if asyncio.iscoroutine(r):
                    await r
            except Exception as e:
                self.error = str(e)
                log.warning("media poll failed: %s", e)
                self.manager = None
                await asyncio.sleep(2)
            try:
                await asyncio.wait_for(stop.wait(), timeout=0.25)
            except asyncio.TimeoutError:
                pass

    def _session(self):
        m = self.manager
        if m is None:
            return None
        try:
            sessions = list(m.get_sessions())
        except Exception:
            sessions = []
        spot = [s for s in sessions if "spotify" in (s.source_app_user_model_id or "").lower()]
        if spot:
            return spot[0]
        if self.only_spotify():
            return None
        try:
            cur = m.get_current_session()
        except Exception:
            cur = None
        return cur or (sessions[0] if sessions else None)

    async def poll(self) -> MediaState:
        s = self._session()
        if s is None:
            self._key = None
            self.state = MediaState()
            return self.state
        app = s.source_app_user_model_id or ""
        info = s.get_playback_info()
        status = int(getattr(info, "playback_status", 0) or 0)
        playing = status == 4
        tl = s.get_timeline_properties()
        pos = _seconds(tl.position)
        start = _seconds(tl.start_time)
        end = _seconds(tl.end_time)
        duration = max(0.0, end - start)
        lut = _epoch(tl.last_updated_time)
        now = time.time()
        # media properties are slower to read; refresh them twice a second or when the timeline jumps
        raw = (round(pos, 1), playing, round(duration))
        if self._props is None or now - self._props_at > 0.5 or raw != self._last_raw:
            self._props = await s.try_get_media_properties_async()
            self._props_at = now
        self._last_raw = raw
        p = self._props
        title = (p.title or "") if p else ""
        artist = (p.artist or "") if p else ""
        album = (p.album_title or "") if p else ""
        key = (app, title, artist, album)
        if key != self._key:
            self._key = key
            self._thumb = await self._read_thumb(p.thumbnail if p else None)
            self._est = None
        st = MediaState(True, app, title, artist, album, duration, pos, now, playing, self._thumb)
        if lut is not None and duration > 0:
            # the player said "pos at lut"; move it on to now
            st.position = pos + (now - lut if playing else 0.0)
            st.at = now
            if duration and st.position > duration + 5:
                st.position = pos
        else:
            # no timestamp: keep our own clock, re-syncing when the reported position jumps
            st.estimated = True
            if self._est is None or abs(self._est[0] - pos) > 0.01 or not playing:
                self._est = (pos, now)
            e_pos, e_at = self._est
            st.position = e_pos + (now - e_at if playing else 0.0)
            st.at = now
        self.state = st
        return st

    async def _read_thumb(self, ref) -> Optional[bytes]:
        if ref is None:
            return None
        try:
            stream = await ref.open_read_async()
            size = int(stream.size or 0)
            if not size:
                return None
            S = self.streams
            try:
                buf = S.Buffer(size)
                res = await stream.read_async(buf, size, S.InputStreamOptions.READ_AHEAD)
                n = int(getattr(res, "length", size) or size)
                data = bytes(memoryview(res))[:n]
                if data:
                    return data
            except Exception as e:
                log.debug("buffer read failed (%s), trying DataReader", e)
            reader = S.DataReader(stream.get_input_stream_at(0))
            await reader.load_async(size)
            arr = bytearray(size)
            try:
                reader.read_bytes(arr)
                return bytes(arr)
            except TypeError:
                ib = reader.read_buffer(size)
                return bytes(memoryview(ib))
        except Exception as e:
            log.info("couldn't read the cover thumbnail: %s", e)
            return None

    async def control(self, name: str, arg=None) -> bool:
        s = self._session()
        if s is None:
            return False
        try:
            if name == "play_pause":
                return bool(await s.try_toggle_play_pause_async())
            if name == "next":
                return bool(await s.try_skip_next_async())
            if name == "prev":
                return bool(await s.try_skip_previous_async())
            if name == "seek" and arg is not None:
                return bool(await s.try_change_playback_position_async(int(float(arg) * 10_000_000)))
        except Exception as e:
            log.warning("control %s failed: %s", name, e)
        return False


class MockMedia:
    """A pretend player that loops the demo song (used for testing without Windows/Spotify)."""

    def __init__(self, web_dir) -> None:
        self.ok = True
        self.error = ""
        self.start = time.time()
        self.paused_at: Optional[float] = None
        self.track = 0
        self.state = MediaState()
        try:
            self.cover = (web_dir / "img" / "demo-cover.jpg").read_bytes()
        except OSError:
            self.cover = None
        self.tracks = [("Oley", "Night Signal", "Demo", 92.0)]

    def pos(self) -> float:
        p = (self.paused_at if self.paused_at is not None else time.time()) - self.start
        return p % self.tracks[self.track][3]

    async def run(self, on_change, stop: asyncio.Event) -> None:
        while not stop.is_set():
            a, t, al, d = self.tracks[self.track]
            self.state = MediaState(True, "Spotify.exe", t, a, al, d, self.pos(), time.time(), self.paused_at is None, self.cover)
            r = on_change(self.state)
            if asyncio.iscoroutine(r):
                await r
            try:
                await asyncio.wait_for(stop.wait(), timeout=0.25)
            except asyncio.TimeoutError:
                pass

    async def control(self, name: str, arg=None) -> bool:
        if name == "play_pause":
            if self.paused_at is None:
                self.paused_at = time.time()
            else:
                self.start += time.time() - self.paused_at
                self.paused_at = None
        elif name == "seek" and arg is not None:
            now = self.paused_at if self.paused_at is not None else time.time()
            self.start = now - float(arg)
        elif name in ("next", "prev"):
            self.start = time.time()
        return True


class NullMedia:
    ok = False
    error = "Not running on Windows"
    state = MediaState()

    async def run(self, on_change, stop: asyncio.Event) -> None:
        await stop.wait()

    async def control(self, name: str, arg=None) -> bool:
        return False
