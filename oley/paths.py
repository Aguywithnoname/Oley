"""Where Oley keeps things.

Run from source, everything lives next to the app (portable), so the Microsoft Store build of Python
can't quietly redirect the data folder somewhere else. Installed (the frozen Oley.exe), the app's own
files are read-only and your settings, caches and custom modes live in %LOCALAPPDATA%\\Oley."""
from __future__ import annotations

import os
import sys
from pathlib import Path

FROZEN = bool(getattr(sys, "frozen", False))
APP_DIR = Path(getattr(sys, "_MEIPASS", "")) if FROZEN else Path(__file__).resolve().parent.parent
WEB_DIR = APP_DIR / "web"
_LOCAL = os.environ.get("LOCALAPPDATA")
USER_DIR = (Path(_LOCAL) / "Oley") if (FROZEN and _LOCAL) else APP_DIR
DATA_DIR = Path(os.environ.get("OLEY_DATA") or (USER_DIR / "data"))
CUSTOM_DIR = USER_DIR / "custom-modes"
CACHE_DIR = DATA_DIR / "cache"
LYRICS_DIR = CACHE_DIR / "lyrics"
COVERS_DIR = CACHE_DIR / "covers"
EDGE_DIR = DATA_DIR / "edge"
IS_WINDOWS = sys.platform == "win32"


def ensure() -> None:
    for d in (DATA_DIR, CACHE_DIR, LYRICS_DIR, COVERS_DIR, EDGE_DIR):
        d.mkdir(parents=True, exist_ok=True)
    # installed: give the custom modes folder its example and guide the first time
    if FROZEN and not CUSTOM_DIR.exists():
        try:
            import shutil
            shutil.copytree(APP_DIR / "custom-modes", CUSTOM_DIR)
        except Exception:
            CUSTOM_DIR.mkdir(parents=True, exist_ok=True)


def launch_command(*args: str) -> str:
    """The command line that starts Oley again (for autostart)."""
    tail = "".join(" " + a for a in args)
    if FROZEN:
        return f'"{sys.executable}"{tail}'
    return f'"{pythonw()}" "{APP_DIR / "Oley.pyw"}"{tail}'


def pythonw() -> str:
    """The windowless interpreter next to the running one (for autostart and restarts)."""
    exe = Path(sys.executable)
    if IS_WINDOWS and exe.name.lower() == "python.exe":
        w = exe.with_name("pythonw.exe")
        if w.exists():
            return str(w)
    return str(exe)
