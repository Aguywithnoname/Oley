"""Lyrics modes you (or your AI) add yourself: every .js file in the custom-modes folder.

A file there registers one mode with O.registerMode('name', Class, {label, desc}); see MAKING-MODES.md.
Files starting with "_" are ignored (templates). Oley picks new files up the next time a window opens."""
from __future__ import annotations

import json
import logging
import re
from pathlib import Path

from .paths import CUSTOM_DIR

log = logging.getLogger("oley.custom")
_REG = re.compile(r"""registerMode\(\s*['"]([a-z0-9][a-z0-9_-]{0,31})['"]""")
_LABEL = re.compile(r"""label\s*:\s*(['"])(.{1,40}?)\1""")
_DESC = re.compile(r"""desc\s*:\s*(['"])(.{1,240}?)\1""")


def files() -> list[Path]:
    if not CUSTOM_DIR.is_dir():
        return []
    return sorted(p for p in CUSTOM_DIR.glob("*.js") if p.is_file() and not p.name.startswith(("_", ".")))


_cache: dict = {"key": None, "val": []}


def scan(builtin: list[str]) -> list[dict]:
    """[{k, n, d, file, thumb}] for each custom mode (built-in names win on a clash)."""
    fs = files()
    try:
        key = tuple((f.name, f.stat().st_mtime_ns) for f in fs) + tuple(
            t.name for t in CUSTOM_DIR.glob("*") if t.suffix.lower() in (".jpg", ".png"))
    except OSError:
        key = None
    if key is not None and key == _cache["key"]:
        return [dict(x) for x in _cache["val"]]
    out, seen = [], set(builtin) | {"auto"}
    for f in fs:
        try:
            src = f.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for m in _REG.finditer(src):
            k = m.group(1)
            if k in seen:
                log.warning("custom mode %r in %s clashes with another mode; skipped", k, f.name)
                continue
            seen.add(k)
            tail = src[m.end(): m.end() + 600]
            lab, desc = _LABEL.search(tail), _DESC.search(tail)
            thumb = next((t.name for t in (CUSTOM_DIR / f"{k}.jpg", CUSTOM_DIR / f"{k}.png") if t.is_file()), "")
            out.append({"k": k, "n": lab.group(2) if lab else k.title(), "d": desc.group(2) if desc else "A custom mode.",
                        "file": f.name, "thumb": thumb})
    _cache["key"], _cache["val"] = key, out
    return [dict(x) for x in out]


def names(builtin: list[str]) -> list[str]:
    return [m["k"] for m in scan(builtin)]


def loader_js(names: list[str], base: str = "custom-modes/") -> str:
    """The small script view.html loads: it adds one <script> per custom mode, in order, while the page parses."""
    return ("/* Written by Oley: loads the lyrics modes in the custom-modes folder. */\n"
            f"(function () {{ var f = {json.dumps(names)}; for (var i = 0; i < f.length; i++) "
            f"document.write('<script src=\"{base}' + encodeURIComponent(f[i]) + '\"><\\/script>'); }})();\n")
