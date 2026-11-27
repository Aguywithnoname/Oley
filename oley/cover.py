"""Sharper album covers. Windows only hands apps a small thumbnail of the cover, so Oley looks the
song up on the iTunes Search API (free, no account) for a large version. Falls back to the thumbnail."""
from __future__ import annotations

import hashlib
import json
import logging
import time
import urllib.parse
import urllib.request

from .lyrics import clean_title, main_artist, _norm
from .paths import COVERS_DIR

log = logging.getLogger("oley.cover")
NEG_TTL = 3 * 24 * 3600


class CoverService:
    def __init__(self) -> None:
        COVERS_DIR.mkdir(parents=True, exist_ok=True)

    def find(self, artist: str, title: str, album: str = "") -> bytes | None:
        a, t = main_artist(artist), clean_title(title)
        key = hashlib.sha1(f"{_norm(a)}|{_norm(t)}|{_norm(album)}".encode()).hexdigest()[:20]
        img = COVERS_DIR / f"{key}.jpg"
        miss = COVERS_DIR / f"{key}.none"
        if img.exists():
            try:
                return img.read_bytes()
            except OSError:
                pass
        if miss.exists() and time.time() - miss.stat().st_mtime < NEG_TTL:
            return None
        try:
            url = self._search(a, t, album)
            if not url:
                miss.write_text("")
                return None
            req = urllib.request.Request(url, headers={"User-Agent": "Oley"})
            with urllib.request.urlopen(req, timeout=9) as r:
                data = r.read()
            if len(data) < 2000:
                return None
            img.write_bytes(data)
            return data
        except Exception as e:  # network trouble just means the thumbnail is used
            log.info("HD cover lookup failed: %s", e)
            return None

    @staticmethod
    def _search(artist: str, title: str, album: str) -> str | None:
        q = urllib.parse.urlencode({"term": f"{artist} {title}", "entity": "song", "limit": 10, "media": "music"})
        req = urllib.request.Request(f"https://itunes.apple.com/search?{q}", headers={"User-Agent": "Oley"})
        with urllib.request.urlopen(req, timeout=9) as r:
            res = json.loads(r.read().decode("utf-8")).get("results", [])
        na, nt, nal = _norm(artist), _norm(title), _norm(album)
        best, best_s = None, 0.0
        for it in res:
            s = 0.0
            if na and na in _norm(it.get("artistName")):
                s += 2
            tn = _norm(it.get("trackName"))
            if tn == nt:
                s += 2
            elif nt and (nt in tn or tn in nt):
                s += 1
            if nal and nal == _norm(it.get("collectionName")):
                s += 1.5
            if s > best_s and it.get("artworkUrl100"):
                best, best_s = it, s
        if not best or best_s < 3:
            return None
        return best["artworkUrl100"].replace("100x100bb", "1200x1200bb")
