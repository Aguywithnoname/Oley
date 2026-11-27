"""Install Oley as a Wallpaper Engine web wallpaper. The wallpaper connects to the running app over
127.0.0.1 and shows the same lyrics, with its own mode (chosen in Oley)."""
from __future__ import annotations

import json
import logging
import re
import shutil
from pathlib import Path
from typing import Optional

from . import PORTS, __version__
from . import custom
from .paths import IS_WINDOWS, WEB_DIR

log = logging.getLogger("oley.wallpaper")
FOLDER = "oley_lyrics"


def steam_paths() -> list[Path]:
    out: list[Path] = []
    if IS_WINDOWS:
        try:
            import winreg
            for hive, key, val in ((winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam", "SteamPath"),
                                   (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\WOW6432Node\Valve\Steam", "InstallPath"),
                                   (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Valve\Steam", "InstallPath")):
                try:
                    with winreg.OpenKey(hive, key) as k:
                        v, _ = winreg.QueryValueEx(k, val)
                        if v:
                            out.append(Path(v))
                except OSError:
                    continue
        except Exception:
            pass
        out.append(Path(r"C:\Program Files (x86)\Steam"))
    libs: list[Path] = []
    for s in out:
        libs.append(s)
        vdf = s / "steamapps" / "libraryfolders.vdf"
        try:
            for m in re.finditer(r'"path"\s+"([^"]+)"', vdf.read_text(encoding="utf-8", errors="ignore")):
                libs.append(Path(m.group(1).replace("\\\\", "\\")))
        except OSError:
            pass
    seen, uniq = set(), []
    for p in libs:
        k = str(p).lower()
        if k not in seen:
            seen.add(k)
            uniq.append(p)
    return uniq


def find_we() -> Optional[Path]:
    for lib in steam_paths():
        we = lib / "steamapps" / "common" / "wallpaper_engine"
        if (we / "projects").exists() or (we / "wallpaper64.exe").exists() or (we / "wallpaper32.exe").exists():
            return we
    return None


def target() -> Optional[Path]:
    we = find_we()
    return (we / "projects" / "myprojects" / FOLDER) if we else None


def status() -> dict:
    we = find_we()
    t = (we / "projects" / "myprojects" / FOLDER) if we else None
    installed = bool(t and (t / "project.json").exists())
    ver = ""
    if installed:
        try:
            ver = json.loads((t / "oley.json").read_text(encoding="utf-8")).get("version", "")
        except Exception:
            pass
    return {"found": bool(we), "path": str(we) if we else "", "installed": installed, "version": ver, "current": ver == __version__}


def install(key: str, thumb: Optional[Path] = None) -> dict:
    t = target()
    if not t:
        return {"ok": False, "msg": "Wallpaper Engine wasn't found in your Steam folders."}
    try:
        t.mkdir(parents=True, exist_ok=True)
        for sub in ("css", "js", "fonts", "img"):
            src, dst = WEB_DIR / sub, t / sub
            if dst.exists():
                shutil.rmtree(dst, ignore_errors=True)
            shutil.copytree(src, dst, ignore=shutil.ignore_patterns("settings*", "thumbs"))
        shutil.copy2(WEB_DIR / "view.html", t / "view.html")
        # your own modes (custom-modes folder) travel with the wallpaper
        cm = t / "custom-modes"
        if cm.exists():
            shutil.rmtree(cm, ignore_errors=True)
        mine = custom.files()
        if mine:
            cm.mkdir(parents=True, exist_ok=True)
            for f in mine:
                shutil.copy2(f, cm / f.name)
        (t / "custom-modes.js").write_text(custom.loader_js([f.name for f in mine]), encoding="utf-8")
        (t / "oley-link.js").write_text(
            "/* Written by Oley: where the app listens, and the key it expects. */\n"
            f"window.OLEY_LINK = {json.dumps({'ports': PORTS, 'key': key})};\n", encoding="utf-8")
        project = {
            "title": "Oley Lyrics",
            "description": "Lyrics from the Oley app, in the mode you pick in Oley.",
            "type": "web", "file": "view.html", "preview": "preview.jpg", "visibility": "private", "tags": ["Music"],
            "general": {"properties": {"schemecolor": {"order": 0, "text": "ui_browse_properties_scheme_color", "type": "color", "value": "0 0 0"}},
                        "supportsaudioprocessing": True},
        }
        (t / "project.json").write_text(json.dumps(project, indent=2), encoding="utf-8")
        (t / "oley.json").write_text(json.dumps({"version": __version__}), encoding="utf-8")
        pv = thumb if thumb and thumb.exists() else WEB_DIR / "img" / "thumbs" / "nebula.jpg"
        if pv.exists():
            shutil.copy2(pv, t / "preview.jpg")
        log.info("Wallpaper Engine wallpaper installed at %s", t)
        return {"ok": True, "msg": "Installed. In Wallpaper Engine, open My Wallpapers and pick \u201cOley Lyrics\u201d."}
    except Exception as e:
        log.exception("Wallpaper Engine install failed")
        return {"ok": False, "msg": f"Couldn't install: {e}"}
