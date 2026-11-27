"""Small Win32 helpers over ctypes: displays, finding/moving windows, idle time, keep-awake,
global hotkey, "is a full-screen app running", autostart, and process clean-up."""
from __future__ import annotations

import ctypes
import logging
import os
import sys
import threading
import time
from typing import Callable, Optional

log = logging.getLogger("oley.win")
IS_WIN = sys.platform == "win32"

if IS_WIN:
    from ctypes import wintypes as W
    user32 = ctypes.WinDLL("user32", use_last_error=True)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    shell32 = ctypes.WinDLL("shell32", use_last_error=True)
    try:
        shcore = ctypes.WinDLL("shcore")
    except OSError:
        shcore = None

    LONG_PTR = ctypes.c_ssize_t
    user32.GetWindowLongPtrW.restype = LONG_PTR
    user32.GetWindowLongPtrW.argtypes = [W.HWND, ctypes.c_int]
    user32.SetWindowLongPtrW.restype = LONG_PTR
    user32.SetWindowLongPtrW.argtypes = [W.HWND, ctypes.c_int, LONG_PTR]
    user32.SetWindowPos.argtypes = [W.HWND, W.HWND, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int, W.UINT]
    user32.GetWindowTextW.argtypes = [W.HWND, W.LPWSTR, ctypes.c_int]
    user32.GetWindowTextLengthW.argtypes = [W.HWND]
    user32.IsWindowVisible.argtypes = [W.HWND]
    user32.PostMessageW.argtypes = [W.HWND, W.UINT, W.WPARAM, W.LPARAM]
    user32.SetForegroundWindow.argtypes = [W.HWND]
    user32.ShowWindow.argtypes = [W.HWND, ctypes.c_int]
    user32.GetWindowThreadProcessId.argtypes = [W.HWND, ctypes.POINTER(W.DWORD)]
    user32.MonitorFromWindow.argtypes = [W.HWND, W.DWORD]
    user32.MonitorFromWindow.restype = W.HMONITOR
    WNDENUMPROC = ctypes.WINFUNCTYPE(W.BOOL, W.HWND, W.LPARAM)
    MONITORENUMPROC = ctypes.WINFUNCTYPE(W.BOOL, W.HMONITOR, W.HDC, ctypes.POINTER(W.RECT), W.LPARAM)

    class MONITORINFOEXW(ctypes.Structure):
        _fields_ = [("cbSize", W.DWORD), ("rcMonitor", W.RECT), ("rcWork", W.RECT), ("dwFlags", W.DWORD), ("szDevice", W.WCHAR * 32)]

    class LASTINPUTINFO(ctypes.Structure):
        _fields_ = [("cbSize", W.UINT), ("dwTime", W.DWORD)]

GWL_STYLE, GWL_EXSTYLE = -16, -20
WS_POPUP, WS_VISIBLE, WS_CAPTION, WS_THICKFRAME = 0x80000000, 0x10000000, 0x00C00000, 0x00040000
WS_SYSMENU, WS_MINIMIZEBOX, WS_MAXIMIZEBOX, WS_CLIPCHILDREN, WS_CLIPSIBLINGS = 0x00080000, 0x00020000, 0x00010000, 0x02000000, 0x04000000
WS_EX_DLGMODALFRAME, WS_EX_WINDOWEDGE, WS_EX_CLIENTEDGE, WS_EX_STATICEDGE = 0x1, 0x100, 0x200, 0x20000
HWND_TOPMOST, HWND_TOP = -1, 0
SWP_FRAMECHANGED, SWP_SHOWWINDOW, SWP_NOOWNERZORDER, SWP_NOACTIVATE = 0x20, 0x40, 0x200, 0x10
WM_CLOSE, WM_HOTKEY, WM_QUIT = 0x10, 0x312, 0x12
MOD_ALT, MOD_CONTROL, MOD_NOREPEAT = 0x1, 0x2, 0x4000
ES_CONTINUOUS, ES_SYSTEM_REQUIRED, ES_DISPLAY_REQUIRED = 0x80000000, 0x1, 0x2


def set_dpi_aware() -> None:
    if not IS_WIN:
        return
    try:
        user32.SetProcessDpiAwarenessContext(ctypes.c_void_p(-4))  # per-monitor v2
    except Exception:
        try:
            shcore.SetProcessDpiAwareness(2)
        except Exception:
            pass


# ------------------------------------------------------------------ displays
def monitors() -> list[dict]:
    """Physical-pixel rectangles of every display, primary first."""
    if not IS_WIN:
        return []
    out: list[dict] = []

    def cb(hmon, hdc, lprc, data):
        mi = MONITORINFOEXW()
        mi.cbSize = ctypes.sizeof(MONITORINFOEXW)
        if user32.GetMonitorInfoW(hmon, ctypes.byref(mi)):
            r = mi.rcMonitor
            scale = 1.0
            if shcore is not None:
                dx, dy = W.UINT(), W.UINT()
                try:
                    if shcore.GetDpiForMonitor(hmon, 0, ctypes.byref(dx), ctypes.byref(dy)) == 0:
                        scale = dx.value / 96.0
                except Exception:
                    pass
            dev = mi.szDevice
            out.append({
                "id": dev.replace("\\\\.\\", "").replace("\\", "").strip() or f"DISPLAY{len(out) + 1}",
                "device": dev, "x": r.left, "y": r.top, "w": r.right - r.left, "h": r.bottom - r.top,
                "primary": bool(mi.dwFlags & 1), "scale": scale,
            })
        return True

    user32.EnumDisplayMonitors(None, None, MONITORENUMPROC(cb), 0)
    out.sort(key=lambda m: (not m["primary"], m["x"], m["y"]))
    for i, m in enumerate(out):
        m["name"] = f"Display {i + 1}"
    return out


# ------------------------------------------------------------------ windows
def window_title(hwnd) -> str:
    n = user32.GetWindowTextLengthW(hwnd)
    buf = ctypes.create_unicode_buffer(n + 1)
    user32.GetWindowTextW(hwnd, buf, n + 1)
    return buf.value


def find_windows(contains: str) -> list[int]:
    if not IS_WIN:
        return []
    found: list[int] = []

    def cb(hwnd, lparam):
        if user32.IsWindowVisible(hwnd):
            t = window_title(hwnd)
            if contains in t:
                found.append(hwnd)
        return True

    user32.EnumWindows(WNDENUMPROC(cb), 0)
    return found


def set_borderless(hwnd: int, x: int, y: int, w: int, h: int, topmost: bool = True) -> None:
    style = user32.GetWindowLongPtrW(hwnd, GWL_STYLE)
    style &= ~(WS_CAPTION | WS_THICKFRAME | WS_SYSMENU | WS_MINIMIZEBOX | WS_MAXIMIZEBOX)
    style |= WS_POPUP | WS_VISIBLE | WS_CLIPCHILDREN | WS_CLIPSIBLINGS
    if ctypes.sizeof(ctypes.c_void_p) == 4 and style > 0x7FFFFFFF:
        style -= 1 << 32  # 32-bit Python: keep it a signed LONG
    user32.SetWindowLongPtrW(hwnd, GWL_STYLE, style)
    ex = user32.GetWindowLongPtrW(hwnd, GWL_EXSTYLE)
    ex &= ~(WS_EX_DLGMODALFRAME | WS_EX_WINDOWEDGE | WS_EX_CLIENTEDGE | WS_EX_STATICEDGE)
    user32.SetWindowLongPtrW(hwnd, GWL_EXSTYLE, ex)
    user32.SetWindowPos(hwnd, W.HWND(HWND_TOPMOST if topmost else HWND_TOP), x, y, w, h, SWP_FRAMECHANGED | SWP_SHOWWINDOW | SWP_NOOWNERZORDER)


def move_window(hwnd: int, x: int, y: int, w: int, h: int) -> None:
    user32.SetWindowPos(hwnd, W.HWND(HWND_TOP), x, y, w, h, SWP_SHOWWINDOW | SWP_NOOWNERZORDER)


def bring_front(hwnd: int) -> None:
    try:
        user32.ShowWindow(hwnd, 9)  # SW_RESTORE
        if not user32.SetForegroundWindow(hwnd):
            # Windows only lets the foreground app hand focus over; a tap of Alt makes us eligible
            user32.keybd_event(0x12, 0, 0, 0)
            user32.keybd_event(0x12, 0, 2, 0)
            user32.SetForegroundWindow(hwnd)
    except Exception:
        pass


def close_window(hwnd: int) -> None:
    user32.PostMessageW(hwnd, WM_CLOSE, 0, 0)


# ------------------------------------------------------------------ input, power, full-screen apps
def idle_seconds() -> float:
    if not IS_WIN:
        return 0.0
    li = LASTINPUTINFO()
    li.cbSize = ctypes.sizeof(LASTINPUTINFO)
    if not user32.GetLastInputInfo(ctypes.byref(li)):
        return 0.0
    return ((kernel32.GetTickCount() - li.dwTime) & 0xFFFFFFFF) / 1000.0


def fullscreen_app_running() -> bool:
    """True while a game, video or presentation owns the screen (Windows' own 'busy' state)."""
    if not IS_WIN:
        return False
    st = ctypes.c_int(0)
    try:
        if shell32.SHQueryUserNotificationState(ctypes.byref(st)) == 0:
            return st.value in (2, 3, 4)
    except Exception:
        pass
    return False


def keep_awake(on: bool) -> None:
    if IS_WIN:
        kernel32.SetThreadExecutionState(ES_CONTINUOUS | ((ES_DISPLAY_REQUIRED | ES_SYSTEM_REQUIRED) if on else 0))


class Hotkey(threading.Thread):
    """Ctrl+Alt+<key> anywhere in Windows."""

    def __init__(self, vk: int, callback: Callable[[], None], mods: int = MOD_CONTROL | MOD_ALT) -> None:
        super().__init__(name="oley-hotkey", daemon=True)
        self.vk, self.mods, self.callback = vk, mods, callback
        self.tid = 0
        self.ok = False
        self.error = ""
        self.ready = threading.Event()

    def run(self) -> None:
        if not IS_WIN:
            self.ready.set()
            return
        self.tid = kernel32.GetCurrentThreadId()
        if not user32.RegisterHotKey(None, 1, self.mods | MOD_NOREPEAT, self.vk):
            self.error = "Ctrl+Alt+L is already used by another app"
            log.warning(self.error)
            self.ready.set()
            return
        self.ok = True
        self.ready.set()
        msg = W.MSG()
        while user32.GetMessageW(ctypes.byref(msg), None, 0, 0) > 0:
            if msg.message == WM_HOTKEY:
                try:
                    self.callback()
                except Exception as e:
                    log.warning("hotkey handler failed: %s", e)
        user32.UnregisterHotKey(None, 1)

    def stop(self) -> None:
        if IS_WIN and self.tid:
            user32.PostThreadMessageW(self.tid, WM_QUIT, 0, 0)


# ------------------------------------------------------------------ start with Windows
RUN_KEY = r"Software\Microsoft\Windows\CurrentVersion\Run"


def get_autostart(name: str = "Oley") -> bool:
    if not IS_WIN:
        return False
    import winreg
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, RUN_KEY) as k:
            winreg.QueryValueEx(k, name)
            return True
    except OSError:
        return False


def set_autostart(on: bool, command: str, name: str = "Oley") -> None:
    if not IS_WIN:
        return
    import winreg
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, RUN_KEY, 0, winreg.KEY_SET_VALUE) as k:
        if on:
            winreg.SetValueEx(k, name, 0, winreg.REG_SZ, command)
        else:
            try:
                winreg.DeleteValue(k, name)
            except OSError:
                pass


# ------------------------------------------------------------------ processes
def procs_with(marker: str) -> list:
    """Processes whose command line contains `marker` (e.g. an Edge profile folder)."""
    try:
        import psutil
    except ImportError:
        return []
    out = []
    m = marker.lower()
    for p in psutil.process_iter(["name", "cmdline"]):
        try:
            cl = " ".join(p.info.get("cmdline") or []).lower()
            if m in cl:
                out.append(p)
        except Exception:
            continue
    return out


def kill_with(marker: str, grace: float = 1.0) -> int:
    ps = procs_with(marker)
    if not ps:
        return 0
    try:
        import psutil
    except ImportError:
        return 0
    for p in ps:
        try:
            p.terminate()
        except Exception:
            pass
    gone, alive = psutil.wait_procs(ps, timeout=grace)
    for p in alive:
        try:
            p.kill()
        except Exception:
            pass
    return len(ps)


def open_path(path: str) -> None:
    try:
        if IS_WIN:
            os.startfile(path)  # type: ignore[attr-defined]
        else:
            import subprocess
            subprocess.Popen(["xdg-open", path])
    except Exception as e:
        log.warning("couldn't open %s: %s", path, e)


def wait_until(pred, timeout: float, step: float = 0.1) -> bool:
    end = time.time() + timeout
    while time.time() < end:
        if pred():
            return True
        time.sleep(step)
    return False


VK = {chr(c): c for c in range(0x41, 0x5B)}


def hwnd_monitor_id(hwnd: int, mons: Optional[list] = None) -> str:
    if not IS_WIN:
        return ""
    hm = user32.MonitorFromWindow(hwnd, 2)
    mi = MONITORINFOEXW()
    mi.cbSize = ctypes.sizeof(MONITORINFOEXW)
    if user32.GetMonitorInfoW(hm, ctypes.byref(mi)):
        return mi.szDevice.replace("\\\\.\\", "").replace("\\", "")
    return ""
