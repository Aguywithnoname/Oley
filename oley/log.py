"""Logging and crash capture."""
from __future__ import annotations

import faulthandler
import logging
import logging.handlers
import sys
import threading
import traceback

from .paths import DATA_DIR

_fault_file = None


def setup(verbose: bool = False) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    root = logging.getLogger()
    root.setLevel(logging.DEBUG if verbose else logging.INFO)
    fh = logging.handlers.RotatingFileHandler(DATA_DIR / "oley.log", maxBytes=600_000, backupCount=1, encoding="utf-8")
    fh.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
    root.addHandler(fh)
    if sys.stderr is not None:
        sh = logging.StreamHandler()
        sh.setFormatter(logging.Formatter("%(levelname)s %(name)s: %(message)s"))
        root.addHandler(sh)
    # pythonw has no console: keep stray prints from crashing the app
    if sys.stdout is None or sys.stderr is None:
        sink = open(DATA_DIR / "oley-console.log", "a", encoding="utf-8", buffering=1)
        if sys.stdout is None:
            sys.stdout = sink
        if sys.stderr is None:
            sys.stderr = sink
    # native crashes (access violations) get a Python stack in crash.log
    global _fault_file
    try:
        _fault_file = open(DATA_DIR / "crash.log", "a", encoding="utf-8")
        faulthandler.enable(_fault_file)
    except Exception:
        pass

    def hook(et, ev, tb):
        logging.getLogger("oley").critical("unhandled error:\n%s", "".join(traceback.format_exception(et, ev, tb)))
        try:
            with open(DATA_DIR / "crash.log", "a", encoding="utf-8") as f:
                f.write("".join(traceback.format_exception(et, ev, tb)) + "\n")
        except Exception:
            pass

    sys.excepthook = hook

    def thook(args):
        if args.exc_type is SystemExit:
            return
        logging.getLogger("oley").error(
            "error in thread %s:\n%s", getattr(args.thread, "name", "?"),
            "".join(traceback.format_exception(args.exc_type, args.exc_value, args.exc_traceback)))

    threading.excepthook = thook
