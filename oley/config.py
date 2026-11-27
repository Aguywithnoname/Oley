"""Settings: defaults, load/save (atomic), dotted get/set, and the part the renderer needs."""
from __future__ import annotations

import copy
import json
import logging
import os
import secrets
import threading
from typing import Any

from .paths import DATA_DIR

log = logging.getLogger("oley.config")

MODES = ["constellation", "source", "orbit", "stack", "nebula", "messages", "editlyric", "pasteup", "foundry", "ascii", "voxel", "shadow", "warp", "glass", "polyester", "motion", "afterglow"]

DEFAULTS: dict[str, Any] = {
    "mode": "auto",                  # the mode for Cinema / Window (or "auto": a fitting one per song)
    "enabled": list(MODES),          # modes Auto may pick
    "intro": True,                   # song card when a song starts
    "clock": True,                   # lock-screen clock in Constellation
    "offset": 0.0,                   # lyrics timing nudge in seconds (+ = earlier)
    "perf": "balanced",              # smooth | balanced | light
    "glow": {
        "cinema": "auto",            # edge glow inside Cinema/Window: auto (per mode) | on | off
        "desktop": True,             # glow around the screen edges while you work
        "intensity": 0.8,
        "color": "cover",            # cover | custom
        "custom": "#ff3bd4",
        "notch": False,
        "react": True,               # pulse with the music
    },
    "opts": {
        "constellation": {"title": True},
        "source": {"handle": "", "cards": True},
        "orbit": {"planet": True},
        "stack": {"boxes": True},
        "nebula": {"comets": True},
        "messages": {"maps": True, "places": True},
        "editlyric": {"room3d": True, "caption": True, "typos": True, "classic": True},
        "pasteup": {"cutout": True, "flashes": True, "emoji": True, "emojiSet": "fluent", "scroll": "mix"},
        "foundry": {"callouts": True, "blueprint": False},
        "ascii": {"flowers": True, "accent": True, "density": "fine"},
        "voxel": {"cover": True, "particles": True},
        "shadow": {"cover": True, "flashes": True, "emoji": True},
        "warp": {"flashes": True, "emoji": True, "cover": True},
        "glass": {"flashes": True, "emoji": True, "cover": True},
        "polyester": {"captions": True, "cutout": True},
        "motion": {"handle": "", "keywords": True},
        "afterglow": {"camera": True, "dock": True},
    },
    "cinema": {
        "screens": {},               # display id -> {"on": bool, "mode": "auto"|mode}
        "close_on_input": True,      # any key or click closes the Cinema
        "away_minutes": 0,           # open by itself after this many idle minutes while music plays (0 = never)
        "keep_awake": True,
        "hotkey": True,              # Ctrl+Alt+L
    },
    "wallpaper": {"mode": "auto"},
    "player": {"only_spotify": True, "hd_covers": True, "cutouts": True},
    "modes_seen": list(MODES),       # modes this settings file has heard of (new ones join Auto once)
    "audio": {"enabled": True},
    "system": {"close_button": "ask", "autostart": False, "tray_hint_shown": False},
    "onboarded": False,              # the welcome tour has been shown
    "key": "",
}

# what renderer pages get (they never see the key)
RENDER_KEYS = ("mode", "enabled", "intro", "clock", "offset", "perf", "glow", "opts")


def _merge(base: dict, over: dict) -> dict:
    out = copy.deepcopy(base)
    for k, v in (over or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _merge(out[k], v)
        else:
            out[k] = v
    return out


class Settings:
    def __init__(self, path=None) -> None:
        self.path = path or (DATA_DIR / "settings.json")
        self._lock = threading.RLock()
        self.data: dict[str, Any] = copy.deepcopy(DEFAULTS)
        self._dirty_load = False
        self.load()
        if self._dirty_load:
            self.save()
        if not self.data.get("key"):
            self.data["key"] = secrets.token_urlsafe(18)
            self.save()

    def load(self) -> None:
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
            if isinstance(raw, dict):
                self.data = _merge(DEFAULTS, raw)
                # modes added in an update join Auto once (unless the user had switched them off before)
                seen = raw.get("modes_seen") or MODES[:7]
                new = [m for m in MODES if m not in seen]
                if new:
                    enabled = [m for m in (self.data.get("enabled") or []) if m in MODES]
                    self.data["enabled"] = enabled + [m for m in new if m not in enabled]
                    self.data["modes_seen"] = list(MODES)
                    self._dirty_load = True
        except FileNotFoundError:
            pass
        except Exception as e:  # a broken file shouldn't stop the app
            log.warning("settings unreadable (%s); using defaults", e)
            try:
                self.path.replace(self.path.with_suffix(".broken.json"))
            except OSError:
                pass

    def save(self) -> None:
        with self._lock:
            try:
                self.path.parent.mkdir(parents=True, exist_ok=True)
                tmp = self.path.with_suffix(".tmp")
                tmp.write_text(json.dumps(self.data, indent=2), encoding="utf-8")
                os.replace(tmp, self.path)
            except OSError as e:
                log.error("couldn't save settings: %s", e)

    def get(self, key: str, default: Any = None) -> Any:
        with self._lock:
            cur: Any = self.data
            for part in key.split("."):
                if not isinstance(cur, dict) or part not in cur:
                    return default
                cur = cur[part]
            return copy.deepcopy(cur)

    def set(self, key: str, value: Any) -> bool:
        """Set a dotted key. Returns True if it changed."""
        if key == "key":
            return False
        with self._lock:
            parts = key.split(".")
            cur = self.data
            for part in parts[:-1]:
                if not isinstance(cur.get(part), dict):
                    cur[part] = {}
                cur = cur[part]
            if cur.get(parts[-1]) == value:
                return False
            cur[parts[-1]] = value
        self.save()
        return True

    @property
    def key(self) -> str:
        return self.data.get("key", "")

    def render(self) -> dict:
        with self._lock:
            return {k: copy.deepcopy(self.data.get(k)) for k in RENDER_KEYS}

    def public(self) -> dict:
        with self._lock:
            d = copy.deepcopy(self.data)
        d.pop("key", None)
        return d
