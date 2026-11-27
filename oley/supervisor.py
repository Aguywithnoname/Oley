"""Keeps Oley up: starts it as a child process and restarts it only after a real crash.
Quitting, or ending it in Task Manager, keeps it closed."""
from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path

CRASH_CODES = {
    3,                       # our own "unhandled error" exit
    0xC0000005, -1073741819,  # access violation
    0xC0000409, -1073740791,  # stack buffer overrun / fail-fast
    0xC0000374, -1073740940,  # heap corruption
    0xC00000FD, -1073741571,  # stack overflow
    0x80000003, -2147483645,  # breakpoint
}


def _child(argv: list[str]) -> int:
    from oley.app import run
    try:
        return run(argv)
    except SystemExit as e:
        return int(e.code or 0)
    except BaseException:
        import logging
        import traceback
        logging.getLogger("oley").critical("fatal:\n%s", traceback.format_exc())
        try:
            from oley.paths import DATA_DIR
            with open(DATA_DIR / "crash.log", "a", encoding="utf-8") as f:
                f.write(time.strftime("%Y-%m-%d %H:%M:%S ") + traceback.format_exc() + "\n")
        except Exception:
            pass
        return 3


def main(script: str) -> None:
    argv = sys.argv[1:]
    if "--child" in argv or os.environ.get("OLEY_NO_SUPERVISOR"):
        sys.exit(_child([a for a in argv if a != "--child"]))
    restarts: list[float] = []
    args = [a for a in argv if a != "--tray"]
    first = True
    while True:
        # the installed Oley.exe is its own interpreter: it gets the flags, not a script path
        head = [sys.executable] if getattr(sys, "frozen", False) else [sys.executable, script]
        cmd = [*head, "--child", *argv] if first else [*head, "--child", "--tray", *args]
        first = False
        cwd = str(Path(sys.executable).parent) if getattr(sys, "frozen", False) else str(Path(script).parent)
        try:
            code = subprocess.call(cmd, cwd=cwd, creationflags=0x08000000 if sys.platform == "win32" else 0)
        except KeyboardInterrupt:
            return
        if code not in CRASH_CODES:
            return
        now = time.time()
        restarts = [t for t in restarts if now - t < 120] + [now]
        if len(restarts) > 4:
            return  # crashing over and over: give up rather than loop forever
        time.sleep(2)
