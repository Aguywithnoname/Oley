"""Cinema, the settings window and the floating window all run in Microsoft Edge "app" windows, each in
its own profile folder, so a graphics hiccup in a page can never take Oley down, and Oley can close
exactly the windows it opened. Cinema windows are made borderless and laid over each chosen display."""
from __future__ import annotations

import logging
import os
import subprocess
import threading
import time
from pathlib import Path
from typing import Optional

from . import winapi
from .paths import EDGE_DIR, IS_WINDOWS

log = logging.getLogger("oley.cinema")


def find_edge() -> Optional[str]:
    if not IS_WINDOWS:
        return None
    cands = []
    for env in ("ProgramFiles(x86)", "ProgramFiles", "LOCALAPPDATA"):
        base = os.environ.get(env)
        if base:
            cands.append(Path(base) / "Microsoft" / "Edge" / "Application" / "msedge.exe")
    for c in cands:
        if c.exists():
            return str(c)
    try:
        import winreg
        for hive in (winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER):
            try:
                with winreg.OpenKey(hive, r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe") as k:
                    v, _ = winreg.QueryValueEx(k, "")
                    if v and Path(v).exists():
                        return v
            except OSError:
                continue
    except Exception:
        pass
    return None


class Edge:
    FLAGS = [
        "--no-first-run", "--no-default-browser-check", "--disable-sync", "--disable-extensions",
        "--hide-crash-restore-bubble", "--disable-session-crashed-bubble", "--noerrdialogs",
        "--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows",
        "--disable-features=msEdgeSidebarV2,msHubApps,msImplicitSignin,msUndersideButton,Translate,msEdgeTranslate",
    ]

    def __init__(self) -> None:
        self.exe = find_edge()

    def profile(self, name: str) -> Path:
        p = EDGE_DIR / name
        p.mkdir(parents=True, exist_ok=True)
        return p

    def launch(self, profile: str, url: str, x: int | None = None, y: int | None = None, w: int | None = None, h: int | None = None) -> bool:
        if not self.exe:
            import webbrowser
            webbrowser.open(url)
            return False
        args = [self.exe, f"--user-data-dir={self.profile(profile)}", *self.FLAGS, f"--app={url}"]
        if x is not None and y is not None:
            args.append(f"--window-position={x},{y}")
        if w and h:
            args.append(f"--window-size={w},{h}")
        try:
            flags = 0x00000008 | 0x00000200 if IS_WINDOWS else 0  # DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP
            subprocess.Popen(args, close_fds=True, creationflags=flags)
            return True
        except Exception as e:
            log.error("couldn't start Edge: %s", e)
            return False

    def running(self, profile: str) -> bool:
        return bool(winapi.procs_with(str(self.profile(profile))))

    def kill(self, profile: str) -> int:
        n = winapi.kill_with(str(self.profile(profile)), grace=1.2)
        if n:
            log.info("closed %d Edge process(es) for %s", n, profile)
        return n


class Cinema:
    """Full-screen lyrics on one or more displays. On/off with Ctrl+Alt+L, the tray or the settings."""

    def __init__(self, engine, settings, edge: Edge) -> None:
        self.engine = engine
        self.settings = settings
        self.edge = edge
        self.on = False
        self.auto = False
        self.opened_at = 0.0
        self.pending: dict[str, dict] = {}
        self._lock = threading.Lock()

    def displays(self) -> list[dict]:
        mons = winapi.monitors()
        conf = self.settings.get("cinema.screens", {}) or {}
        any_on = any(c.get("on") for c in conf.values())
        for m in mons:
            c = conf.get(m["id"], {})
            m["on"] = bool(c.get("on")) if any_on else m["primary"]
            m["mode"] = c.get("mode", "auto")
        return mons

    def toggle(self) -> None:
        if self.on:
            self.close()
        else:
            self.open()

    def open(self, auto: bool = False) -> None:
        if self.on:
            return
        targets = [d for d in self.displays() if d["on"]] or self.displays()[:1]
        if not targets:
            log.warning("no displays found")
            return
        self.on = True
        self.auto = auto
        self.opened_at = time.time()
        if self.settings.get("cinema.keep_awake", True):
            winapi.keep_awake(True)
        for d in targets:
            mode = d.get("mode", "auto")
            url = self.engine.url("view.html", role="cinema", screen=d["id"], mode=None if mode in ("auto", None) else mode)
            scale = d.get("scale", 1.0) or 1.0
            # open roughly on the right display; we then pin it to the exact physical rectangle
            ok = self.edge.launch("cinema", url, x=int(d["x"] / scale) + 40, y=int(d["y"] / scale) + 40, w=900, h=560)
            with self._lock:
                self.pending[d["id"]] = {"d": d, "t": time.time(), "placed": False, "hwnd": None, "edge": ok}
            time.sleep(0.15)
        log.info("Cinema on (%s)%s", ", ".join(d["id"] for d in targets), " - opened by itself" if auto else "")
        threading.Thread(target=self._place, name="oley-cinema-place", daemon=True).start()
        self.engine.state_changed()

    def _place(self) -> None:
        """Find each Cinema window by its title and pin it borderless over its display."""
        end = time.time() + 12
        while time.time() < end and self.on:
            with self._lock:
                todo = [(sid, p) for sid, p in self.pending.items() if not p["placed"]]
            if not todo:
                break
            for sid, p in todo:
                hw = winapi.find_windows(f"Oley Cinema {sid}")
                if hw:
                    d = p["d"]
                    try:
                        winapi.set_borderless(hw[0], d["x"], d["y"], d["w"], d["h"], topmost=True)
                        time.sleep(0.05)
                        winapi.set_borderless(hw[0], d["x"], d["y"], d["w"], d["h"], topmost=True)
                        winapi.bring_front(hw[0])
                        p["placed"], p["hwnd"] = True, hw[0]
                        log.info("Cinema window on %s at %dx%d", sid, d["w"], d["h"])
                    except Exception as e:
                        log.warning("couldn't place Cinema on %s: %s", sid, e)
                        p["placed"] = True
            time.sleep(0.12)

    def close(self) -> None:
        if not self.on:
            return
        self.on = False
        self.auto = False
        winapi.keep_awake(False)
        self.engine.send_cmd("close", roles=("cinema",))
        with self._lock:
            hwnds = [p["hwnd"] for p in self.pending.values() if p.get("hwnd")]
            self.pending.clear()

        def finish():
            time.sleep(0.5)
            for h in hwnds:
                try:
                    winapi.close_window(h)
                except Exception:
                    pass
            time.sleep(0.6)
            self.edge.kill("cinema")
        threading.Thread(target=finish, name="oley-cinema-close", daemon=True).start()
        log.info("Cinema off")
        self.engine.state_changed()

    def input(self, screen: str, kind: str) -> None:
        if not self.on or time.time() - self.opened_at < 1.5:
            return
        if self.settings.get("cinema.close_on_input", True) or self.auto:
            self.close()

    def windows_gone(self) -> bool:
        return not self.edge.running("cinema")
