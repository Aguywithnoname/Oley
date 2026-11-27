"""Synced lyrics from LRCLIB (free, no account), with a disk cache and local .lrc overrides.

Drop your own `Artist - Title.lrc` into `data/lyrics/` to use it instead of LRCLIB."""
from __future__ import annotations

import hashlib
import json
import logging
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from . import __version__
from .paths import DATA_DIR, LYRICS_DIR

log = logging.getLogger("oley.lyrics")
API = "https://lrclib.net/api"
UA = f"Oley/{__version__} (personal lyrics display for Windows)"
NEG_TTL = 24 * 3600

_TAG = re.compile(r"^\s*\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]")
_WORD = re.compile(r"<(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)>")
_META = re.compile(r"^\s*\[(ar|ti|al|by|offset|length|re|ve|au|#):([^\]]*)\]\s*$", re.I)


def _sec(m: str, s: str) -> float:
    return int(m) * 60 + float(s.replace(":", "."))


def parse_lrc(text: str) -> list[dict[str, Any]]:
    """LRC -> [{t, text, words?}] sorted by time. Handles several stamps per line, [offset:], <word> stamps."""
    out: list[dict[str, Any]] = []
    offset = 0.0
    for raw in (text or "").splitlines():
        meta = _META.match(raw)
        if meta:
            if meta.group(1).lower() == "offset":
                try:
                    offset = float(meta.group(2)) / 1000.0
                except ValueError:
                    pass
            continue
        stamps = []
        rest = raw
        while True:
            m = _TAG.match(rest)
            if not m:
                break
            stamps.append(_sec(m.group(1), m.group(2)))
            rest = rest[m.end():]
        if not stamps:
            continue
        words = None
        if _WORD.search(rest):
            words = []
            pieces = _WORD.split(rest)
            # pieces = [lead, m, s, text, m, s, text, ...]
            for i in range(1, len(pieces) - 2, 3):
                t = _sec(pieces[i], pieces[i + 1]) - offset
                for w in (pieces[i + 2] or "").split():
                    words.append({"t": round(t, 3), "w": w})
        clean = _WORD.sub("", rest).strip()
        for t in stamps:
            item: dict[str, Any] = {"t": round(max(0.0, t - offset), 3), "text": clean}
            if words:
                item["words"] = words
            out.append(item)
    out.sort(key=lambda x: x["t"])
    return out


_JUNK = re.compile(
    r"\s*[(\[](?:[^)\]]*?(?:feat\.?|ft\.|with |remaster|remastered|version|edit|live|mono|stereo|deluxe|bonus|explicit|clean)[^)\]]*?)[)\]]",
    re.I,
)
_DASH = re.compile(r"\s+-\s+(?:.*?(?:remaster|remastered|version|edit|live|mono|stereo|mix|from|bonus).*)$", re.I)


def clean_title(t: str) -> str:
    t = _JUNK.sub("", t or "")
    t = _DASH.sub("", t)
    return t.strip() or (t or "").strip()


def main_artist(a: str) -> str:
    return re.split(r",\s*|\s+&\s+|\s+feat\.?\s+|\s+ft\.?\s+|\s+x\s+|;\s*", a or "", flags=re.I)[0].strip()


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (s or "").lower())


class LyricsService:
    def __init__(self) -> None:
        LYRICS_DIR.mkdir(parents=True, exist_ok=True)
        (DATA_DIR / "lyrics").mkdir(parents=True, exist_ok=True)

    # ---------------------------------------------------------------- public
    def fetch(self, artist: str, title: str, album: str = "", duration: float = 0.0, force: bool = False) -> dict[str, Any]:
        local = self._local(artist, title)
        if local:
            return local
        key = hashlib.sha1(f"{_norm(main_artist(artist))}|{_norm(clean_title(title))}".encode()).hexdigest()[:20]
        cache = LYRICS_DIR / f"{key}.json"
        if not force:
            try:
                c = json.loads(cache.read_text(encoding="utf-8"))
                if c.get("status") in ("synced", "plain", "instrumental"):
                    return c
                if c.get("status") == "none" and time.time() - c.get("at", 0) < NEG_TTL:
                    return c
            except Exception:
                pass
        try:
            res = self._lookup(artist, title, album, duration)
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            log.warning("lyrics lookup failed: %s", e)
            return {"status": "error", "synced": False, "lines": [], "source": "lrclib"}
        out = self._shape(res)
        out["at"] = time.time()
        try:
            cache.write_text(json.dumps(out), encoding="utf-8")
        except OSError:
            pass
        return out

    # ---------------------------------------------------------------- internals
    def _local(self, artist: str, title: str) -> dict[str, Any] | None:
        folder = DATA_DIR / "lyrics"
        want = {_norm(f"{artist} - {title}"), _norm(f"{main_artist(artist)} - {clean_title(title)}")}
        try:
            for f in folder.glob("*.lrc"):
                if _norm(f.stem) in want:
                    lines = parse_lrc(f.read_text(encoding="utf-8", errors="replace"))
                    if lines:
                        log.info("using local lyrics %s", f.name)
                        return {"status": "synced", "synced": True, "lines": lines, "source": "local"}
        except OSError:
            pass
        return None

    def _get(self, path: str, params: dict[str, Any]) -> Any:
        q = urllib.parse.urlencode({k: v for k, v in params.items() if v not in (None, "")})
        req = urllib.request.Request(f"{API}/{path}?{q}", headers={"User-Agent": UA, "Accept": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=9) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            raise

    def _lookup(self, artist: str, title: str, album: str, duration: float) -> dict | None:
        dur = int(round(duration)) if duration and duration > 0 else None
        a1, t1 = main_artist(artist), clean_title(title)
        tries = [
            ("get", {"artist_name": artist, "track_name": title, "album_name": album, "duration": dur}),
            ("get", {"artist_name": a1, "track_name": t1, "duration": dur}),
            ("get", {"artist_name": a1, "track_name": t1}),
        ]
        seen = set()
        plain_hit = None
        for path, p in tries:
            k = json.dumps(p, sort_keys=True)
            if k in seen:
                continue
            seen.add(k)
            r = self._get(path, p)
            if r and (r.get("syncedLyrics") or r.get("instrumental")):
                return r
            if r and r.get("plainLyrics") and plain_hit is None:
                plain_hit = r
        best = None
        for params in ({"track_name": t1, "artist_name": a1}, {"q": f"{a1} {t1}"}):
            results = self._get("search", params) or []
            best = self._best(results, a1, t1, duration) or best
            if best and best.get("syncedLyrics"):
                return best
        return best or plain_hit

    @staticmethod
    def _best(results: list, artist: str, title: str, duration: float) -> dict | None:
        na, nt = _norm(artist), _norm(title)
        scored = []
        for r in results or []:
            s = 0.0
            if _norm(r.get("trackName")) == nt:
                s += 3
            elif nt and nt in _norm(r.get("trackName")):
                s += 1.5
            if na and na in _norm(r.get("artistName")):
                s += 2
            if duration and r.get("duration"):
                d = abs(float(r["duration"]) - duration)
                s += 2 if d < 2 else 1 if d < 5 else -2 if d > 15 else 0
            if r.get("syncedLyrics"):
                s += 2
            scored.append((s, r))
        scored.sort(key=lambda x: -x[0])
        return scored[0][1] if scored and scored[0][0] >= 3 else None

    @staticmethod
    def _shape(res: dict | None) -> dict[str, Any]:
        if not res:
            return {"status": "none", "synced": False, "lines": [], "source": "lrclib"}
        if res.get("instrumental"):
            return {"status": "instrumental", "synced": False, "lines": [], "source": "lrclib"}
        if res.get("syncedLyrics"):
            lines = parse_lrc(res["syncedLyrics"])
            if lines:
                return {"status": "synced", "synced": True, "lines": lines, "source": "lrclib"}
        if res.get("plainLyrics"):
            return {"status": "plain", "synced": False, "lines": [], "plain": res["plainLyrics"], "source": "lrclib"}
        return {"status": "none", "synced": False, "lines": [], "source": "lrclib"}
