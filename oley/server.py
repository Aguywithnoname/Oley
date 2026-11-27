"""A tiny local web server (127.0.0.1 only): serves the pages, the cover image, a small API and a
WebSocket that keeps every Oley window, the settings and the Wallpaper Engine wallpaper in sync."""
from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import logging
import mimetypes
import re
import struct
import urllib.parse
from . import custom
from .paths import DATA_DIR
from pathlib import Path
from typing import Any, Optional

log = logging.getLogger("oley.server")
GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
MIME = {
    ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
    ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml",
    ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf", ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8",
}


class Client:
    def __init__(self, writer: asyncio.StreamWriter, role: str, screen: str) -> None:
        self.writer = writer
        self.role = role
        self.screen = screen
        self.lock = asyncio.Lock()
        self.alive = True

    async def send(self, text: str) -> None:
        if not self.alive:
            return
        data = text.encode("utf-8")
        n = len(data)
        if n < 126:
            head = struct.pack("!BB", 0x81, n)
        elif n < 65536:
            head = struct.pack("!BBH", 0x81, 126, n)
        else:
            head = struct.pack("!BBQ", 0x81, 127, n)
        async with self.lock:
            try:
                self.writer.write(head + data)
                await self.writer.drain()
            except Exception:
                self.alive = False

    def backlog(self) -> int:
        try:
            return self.writer.transport.get_write_buffer_size()
        except Exception:
            return 0


class Server:
    def __init__(self, engine, web_dir: Path, key: str) -> None:
        self.engine = engine
        self.web = web_dir.resolve()
        self.key = key
        self.clients: list[Client] = []
        self.srv: Optional[asyncio.base_events.Server] = None
        self.port = 0

    async def start(self, ports: list[int]) -> int:
        last = None
        for p in ports:
            try:
                self.srv = await asyncio.start_server(self._handle, "127.0.0.1", p, limit=1 << 20)
                self.port = p
                log.info("listening on 127.0.0.1:%d", p)
                return p
            except OSError as e:
                last = e
        raise OSError(f"no free port in {ports[0]}-{ports[-1]}: {last}")

    async def stop(self) -> None:
        for c in list(self.clients):
            c.alive = False
            try:
                c.writer.close()
            except Exception:
                pass
        if self.srv:
            self.srv.close()
            try:
                await asyncio.wait_for(self.srv.wait_closed(), 2)
            except Exception:
                pass

    # ---------------------------------------------------------------- broadcast
    def count(self, roles=None) -> int:
        return sum(1 for c in self.clients if c.alive and (roles is None or c.role in roles))

    async def broadcast(self, msg: dict, roles=None, screen=None, droppable=False) -> None:
        if not self.clients:
            return
        text = json.dumps(msg, separators=(",", ":"))
        tasks = []
        for c in list(self.clients):
            if not c.alive or (roles is not None and c.role not in roles) or (screen is not None and c.screen != screen):
                continue
            if droppable and c.backlog() > 256_000:
                continue  # a stalled window shouldn't pile up audio frames
            tasks.append(c.send(text))
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    # ---------------------------------------------------------------- http
    async def _handle(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        try:
            head = await asyncio.wait_for(reader.readuntil(b"\r\n\r\n"), 10)
        except Exception:
            writer.close()
            return
        try:
            lines = head.decode("latin-1").split("\r\n")
            method, target, _ = (lines[0].split(" ", 2) + ["", ""])[:3]
            headers = {}
            for ln in lines[1:]:
                if ":" in ln:
                    k, v = ln.split(":", 1)
                    headers[k.strip().lower()] = v.strip()
            url = urllib.parse.urlsplit(target)
            path = urllib.parse.unquote(url.path)
            q = {k: v[0] for k, v in urllib.parse.parse_qs(url.query).items()}
            if path == "/ws" and headers.get("upgrade", "").lower() == "websocket":
                await self._websocket(reader, writer, headers, q)
                return
            body = b""
            if method == "POST":
                n = int(headers.get("content-length", "0") or 0)
                if 0 < n < 1_000_000:
                    body = await reader.readexactly(n)
            if path.startswith("/api/"):
                await self._api(writer, method, path[5:], q, body)
            elif path.startswith("/art/"):
                await self._art(writer)
            elif path.startswith("/mask/"):
                await self._mask(writer)
            elif path.startswith("/emoji/"):
                await self._emoji(writer, path[7:])
            elif path == "/custom-modes.js":
                js = custom.loader_js([f.name for f in custom.files()])
                await self._send(writer, 200, js.encode("utf-8"), MIME[".js"], {"Cache-Control": "no-store"})
            elif path.startswith("/custom-modes/"):
                await self._custom(writer, path[len("/custom-modes/"):])
            else:
                await self._static(writer, path)
        except Exception as e:
            log.debug("request failed: %s", e)
            try:
                await self._send(writer, 500, b"error", "text/plain")
            except Exception:
                pass

    async def _send(self, writer, code: int, body: bytes, ctype: str, extra: dict | None = None) -> None:
        reason = {200: "OK", 403: "Forbidden", 404: "Not Found", 500: "Error", 400: "Bad Request"}.get(code, "OK")
        h = [f"HTTP/1.1 {code} {reason}", f"Content-Type: {ctype}", f"Content-Length: {len(body)}", "Connection: close",
             "Cache-Control: no-store", "Access-Control-Allow-Origin: *"]
        for k, v in (extra or {}).items():
            h.append(f"{k}: {v}")
        writer.write(("\r\n".join(h) + "\r\n\r\n").encode("latin-1") + body)
        try:
            await writer.drain()
        finally:
            writer.close()

    async def _static(self, writer, path: str) -> None:
        if path in ("", "/"):
            path = "/settings.html"
        f = (self.web / path.lstrip("/")).resolve()
        try:
            f.relative_to(self.web)
        except ValueError:
            await self._send(writer, 403, b"no", "text/plain")
            return
        if not f.is_file():
            await self._send(writer, 404, b"not found", "text/plain")
            return
        ctype = MIME.get(f.suffix.lower()) or mimetypes.guess_type(str(f))[0] or "application/octet-stream"
        data = await asyncio.get_running_loop().run_in_executor(None, f.read_bytes)
        cache = {"Cache-Control": "max-age=86400"} if f.suffix.lower() in (".woff", ".woff2", ".ttf", ".otf") else None
        await self._send(writer, 200, data, ctype, cache)

    async def _custom(self, writer, name: str) -> None:
        f = (custom.CUSTOM_DIR / name).resolve()
        try:
            f.relative_to(custom.CUSTOM_DIR.resolve())
        except ValueError:
            await self._send(writer, 403, b"no", "text/plain")
            return
        if not f.is_file() or f.suffix.lower() not in (".js", ".jpg", ".jpeg", ".png", ".webp", ".json", ".svg"):
            await self._send(writer, 404, b"not found", "text/plain")
            return
        data = await asyncio.get_running_loop().run_in_executor(None, f.read_bytes)
        ctype = MIME.get(f.suffix.lower()) or "application/octet-stream"
        await self._send(writer, 200, data, ctype, {"Cache-Control": "no-store"})

    async def _art(self, writer) -> None:
        art = self.engine.art
        if not art:
            await self._send(writer, 404, b"no art", "text/plain")
            return
        data = art["bytes"]
        ctype = "image/png" if data[:4] == b"\x89PNG" else "image/jpeg"
        await self._send(writer, 200, data, ctype)

    async def _mask(self, writer) -> None:
        m = getattr(self.engine, "mask", None)
        if not m:
            await self._send(writer, 404, b"no mask", "text/plain")
            return
        await self._send(writer, 200, m["bytes"], "image/png")

    # Fluent 3D emoji (Microsoft, MIT licence): fetched once from a public mirror and kept on disk
    # emoji pictures, by set. Nothing is bundled: each one is downloaded the first time a song needs it
    # and kept in the data folder. Apple's set is Apple's artwork (fine for your own use, not for
    # redistributing); Fluent is Microsoft's, MIT licensed.
    _EMOJI_SRC = {
        "apple": (
            "https://raw.githubusercontent.com/iamcal/emoji-data/master/img-apple-160/{cp}.png",
            "https://cdn.jsdelivr.net/npm/emoji-datasource-apple@16.0.0/img/apple/64/{cp}.png",
            "https://cdnjs.cloudflare.com/ajax/libs/emoji-datasource-apple/15.1.2/img/apple/64/{cp}.png",
            "https://raw.githubusercontent.com/iamcal/emoji-data/master/img-apple-64/{cp}.png",
        ),
        "fluent": (
            "https://cdn.jsdelivr.net/npm/@lobehub/fluent-emoji-3d@1.1.0/assets/{cp}.webp",
            "https://registry.npmmirror.com/@lobehub/fluent-emoji-3d/latest/files/assets/{cp}.webp",
            "https://cdn.jsdelivr.net/gh/shuding/fluentui-emoji-unicode/assets/{cp}_3d.png",
            "https://fluent-emoji.ciffelia.com/{cp}_3d.webp",
        ),
    }
    _emoji_miss: set = set()

    async def _emoji(self, writer, name: str) -> None:
        # /emoji/<set>/<codepoints>.png, or the older /emoji/<codepoints>.png (Fluent)
        kind, _, file = name.rpartition("/")
        kind = kind or "fluent"
        cp = file.rsplit(".", 1)[0].lower()
        if kind not in self._EMOJI_SRC or not re.fullmatch(r"[0-9a-f]{2,6}(-[0-9a-f]{2,6}){0,7}", cp):
            await self._send(writer, 400, b"bad", "text/plain")
            return
        folder = DATA_DIR / "emoji" if kind == "fluent" else DATA_DIR / "emoji" / kind
        for ext, ctype in ((".webp", "image/webp"), (".png", "image/png")):
            f = folder / (cp + ext)
            if f.is_file():
                await self._send(writer, 200, f.read_bytes(), ctype, {"Cache-Control": "max-age=2592000"})
                return
        if (kind, cp) in self._emoji_miss:
            await self._send(writer, 404, b"none", "text/plain")
            return
        got = await asyncio.get_running_loop().run_in_executor(None, self._fetch_emoji, kind, cp)
        if not got:
            self._emoji_miss.add((kind, cp))
            await self._send(writer, 404, b"none", "text/plain")
            return
        data, ext = got
        try:
            folder.mkdir(parents=True, exist_ok=True)
            (folder / (cp + ext)).write_bytes(data)
        except OSError:
            pass
        await self._send(writer, 200, data, "image/webp" if ext == ".webp" else "image/png", {"Cache-Control": "max-age=2592000"})

    def _fetch_emoji(self, kind: str, cp: str):
        import urllib.request
        bare = cp.replace("-fe0f", "")
        names = [cp] + ([bare] if bare != cp else [cp + "-fe0f"] if "-" not in cp else [])
        for src in self._EMOJI_SRC[kind]:
            for name in names:
                url = src.format(cp=name)
                try:
                    req = urllib.request.Request(url, headers={"User-Agent": "Oley"})
                    with urllib.request.urlopen(req, timeout=8) as r:
                        data = r.read(2_000_000)
                        ctype = (r.headers.get("Content-Type") or "").lower()
                    if len(data) > 200 and (ctype.startswith("image/") or data[:4] in (b"RIFF", b"\x89PNG")):
                        return data, (".webp" if data[:4] == b"RIFF" else ".png")
                except Exception as e:
                    log.debug("emoji %s from %s: %s", name, url, e)
        return None

    async def _api(self, writer, method: str, name: str, q: dict, body: bytes) -> None:
        if q.get("k") != self.key:
            await self._send(writer, 403, b'{"error":"key"}', "application/json")
            return
        payload: dict[str, Any] = {}
        if body:
            try:
                payload = json.loads(body.decode("utf-8"))
            except Exception:
                payload = {}
        res = await self.engine.api(name, q, payload)
        await self._send(writer, 200, json.dumps(res).encode("utf-8"), "application/json")

    # ---------------------------------------------------------------- websocket
    async def _websocket(self, reader, writer, headers: dict, q: dict) -> None:
        if q.get("k") != self.key:
            writer.write(b"HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n")
            await writer.drain()
            writer.close()
            return
        key = headers.get("sec-websocket-key", "")
        accept = base64.b64encode(hashlib.sha1((key + GUID).encode()).digest()).decode()
        writer.write(("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
                      f"Sec-WebSocket-Accept: {accept}\r\n\r\n").encode())
        await writer.drain()
        try:
            sock = writer.get_extra_info("socket")
            if sock is not None:
                import socket
                sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        except Exception:
            pass
        client = Client(writer, q.get("role", "view")[:20], q.get("screen", "")[:40])
        self.clients.append(client)
        log.info("connected: %s %s", client.role, client.screen)
        try:
            await self.engine.on_connect(client)
            buf = b""
            while client.alive:
                fin, op, data = await self._read_frame(reader)
                if op == 0x8:
                    break
                if op == 0x9:
                    async with client.lock:
                        writer.write(struct.pack("!BB", 0x8A, len(data[:125])) + data[:125])
                        await writer.drain()
                    continue
                if op in (0x1, 0x0):
                    buf += data
                    if fin:
                        text = buf.decode("utf-8", "replace")
                        buf = b""
                        try:
                            msg = json.loads(text)
                        except Exception:
                            continue
                        if isinstance(msg, dict):
                            await self.engine.on_message(client, msg)
        except (asyncio.IncompleteReadError, ConnectionError):
            pass
        except Exception as e:
            log.debug("ws error: %s", e)
        finally:
            client.alive = False
            if client in self.clients:
                self.clients.remove(client)
            try:
                writer.close()
            except Exception:
                pass
            log.info("disconnected: %s %s", client.role, client.screen)
            try:
                await self.engine.on_disconnect(client)
            except Exception as e:
                log.debug("disconnect hook failed: %s", e)

    @staticmethod
    async def _read_frame(reader):
        h = await reader.readexactly(2)
        fin = bool(h[0] & 0x80)
        op = h[0] & 0x0F
        masked = bool(h[1] & 0x80)
        n = h[1] & 0x7F
        if n == 126:
            n = struct.unpack("!H", await reader.readexactly(2))[0]
        elif n == 127:
            n = struct.unpack("!Q", await reader.readexactly(8))[0]
        if n > 4_000_000:
            raise ConnectionError("frame too large")
        mask = await reader.readexactly(4) if masked else None
        data = await reader.readexactly(n) if n else b""
        if mask and n:
            # unmask with one big-int xor (fast for the small frames we get)
            mm = (mask * (n // 4 + 1))[:n]
            data = (int.from_bytes(data, "big") ^ int.from_bytes(mm, "big")).to_bytes(n, "big")
        return fin, op, data
