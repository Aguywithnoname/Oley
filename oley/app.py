"""Oley entry point: one instance at a time (a newer version takes over an older one), then the engine
and the shell (tray, Cinema, glow) or, without Qt, a headless shell."""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
import urllib.request

from . import APP_NAME, __version__
from . import log as oley_log
from .config import Settings
from .paths import DATA_DIR, ensure

log = logging.getLogger("oley")


def _ver(v: str) -> tuple:
    out = []
    for p in str(v).split("."):
        try:
            out.append(int(p))
        except ValueError:
            out.append(0)
    return tuple(out)


def _other_instance():
    try:
        info = json.loads((DATA_DIR / "instance.json").read_text(encoding="utf-8"))
        port, key = int(info["port"]), info["key"]
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/hello?k={key}", timeout=1.5) as r:
            hello = json.loads(r.read().decode("utf-8"))
        if hello.get("app") == "oley":
            return port, key, hello
    except Exception:
        pass
    return None


def _post(port: int, key: str, name: str) -> None:
    try:
        req = urllib.request.Request(f"http://127.0.0.1:{port}/api/{name}?k={key}", data=b"{}", method="POST")
        urllib.request.urlopen(req, timeout=2).read()
    except Exception:
        pass


def run(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="oley")
    ap.add_argument("--tray", action="store_true", help="start in the tray without opening the settings")
    ap.add_argument("--mock", action="store_true", help="pretend player (testing)")
    ap.add_argument("--headless", action="store_true", help="no tray/glow/Cinema windows")
    ap.add_argument("--verbose", action="store_true")
    ap.add_argument("--child", action="store_true", help=argparse.SUPPRESS)
    args, _ = ap.parse_known_args(argv)
    ensure()
    oley_log.setup(args.verbose)
    log.info("%s %s starting (python %s, pid %d)", APP_NAME, __version__, sys.version.split()[0], os.getpid())

    other = _other_instance()
    if other:
        port, key, hello = other
        if _ver(hello.get("version", "0")) < _ver(__version__):
            log.info("taking over from older version %s", hello.get("version"))
            _post(port, key, "quit")
            for _ in range(40):
                time.sleep(0.2)
                if not _other_instance():
                    break
        else:
            log.info("already running; showing it")
            if not args.tray:
                _post(port, key, "show")
            return 0

    settings = Settings()
    from .engine import Engine
    engine = Engine(settings, mock=args.mock)
    engine.start()

    if not args.headless:
        try:
            from .shell import Shell
        except Exception as e:  # PySide6 missing: still useful, just no tray/glow
            log.warning("tray/glow unavailable (%s); running headless", e)
            Shell = None
        if Shell is not None:
            shell = Shell(engine, settings, open_settings=not args.tray)
            return shell.exec()
    # headless
    if not args.tray and not args.mock:
        engine.shell.call("open_settings")
    log.info("headless: %s", engine.url("settings.html"))
    try:
        while not engine.stopped.is_set():
            time.sleep(0.5)
    except KeyboardInterrupt:
        engine.stop()
    engine.join()
    return 0
