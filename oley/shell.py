"""The frame around the lyric modes: tray icon and menu, Cinema on/off (Ctrl+Alt+L, the tray, the
settings, or by itself when you're away), the glow around the screen edges while you work, the
settings window, and how Oley closes ("Quit" or "Keep running", with a 4-second guarantee)."""
from __future__ import annotations

import logging
import math
import os
import sys
import threading
import time

from PySide6.QtCore import QObject, QPointF, QRectF, Qt, QTimer, Signal
from PySide6.QtGui import (QAction, QActionGroup, QColor, QFont, QGuiApplication, QIcon, QImage, QLinearGradient,
                           QPainter, QPainterPath, QPixmap, QRadialGradient)
from PySide6.QtWidgets import QApplication, QCheckBox, QMenu, QMessageBox, QSystemTrayIcon, QWidget

from . import APP_NAME, __version__, custom, wallpaper, winapi
from .brand import CREDIT, ICON_SIZES
from .cinema import Cinema, Edge
from .config import MODES
from .paths import CUSTOM_DIR, DATA_DIR, EDGE_DIR, WEB_DIR, launch_command

log = logging.getLogger("oley.shell")
LABELS = {"auto": "Auto (fits each song)", "constellation": "Constellation", "source": "Source", "orbit": "Orbit", "stack": "Stack",
          "nebula": "Nebula", "messages": "Messages", "editlyric": "Editlyric", "pasteup": "Pasteup", "foundry": "Foundry",
          "ascii": "ASCII", "voxel": "Voxel", "shadow": "Shadowplay", "warp": "Warp", "glass": "Glass"}


# ====================================================================== icon & colour
def make_icon() -> QIcon:
    """The Oley mark (web/img/brand). Drawn by hand only if those files are missing."""
    icon = QIcon()
    for n in ICON_SIZES:
        f = WEB_DIR / "img" / "brand" / f"icon-{n}.png"
        if f.is_file():
            pm = QPixmap(str(f))
            if not pm.isNull():
                icon.addPixmap(pm)
    if not icon.isNull():
        return icon
    for s in (16, 32, 64, 256):
        pm = QPixmap(s, s)
        pm.fill(Qt.transparent)
        p = QPainter(pm)
        p.setRenderHint(QPainter.Antialiasing)
        g = QLinearGradient(0, 0, s, s)
        g.setColorAt(0, QColor(255, 163, 79))
        g.setColorAt(0.45, QColor(255, 63, 142))
        g.setColorAt(1, QColor(107, 61, 255))
        path = QPainterPath()
        path.addRoundedRect(QRectF(0, 0, s, s), s * 0.26, s * 0.26)
        p.fillPath(path, g)
        ring = QPainterPath()
        ring.addEllipse(QPointF(s * 0.48, s * 0.475), s * 0.275, s * 0.275)
        hole = QPainterPath()
        hole.addEllipse(QPointF(s * 0.48, s * 0.475), s * 0.17, s * 0.17)
        p.fillPath(ring.subtracted(hole), QColor(255, 255, 255))
        p.end()
        icon.addPixmap(pm)
    return icon


def palette_from_bytes(data: bytes | None) -> tuple[QColor, QColor]:
    default = (QColor(255, 70, 170), QColor(130, 80, 255))
    if not data:
        return default
    img = QImage()
    if not img.loadFromData(data):
        return default
    img = img.scaled(28, 28, Qt.IgnoreAspectRatio, Qt.SmoothTransformation)
    B = 24
    wsum = [0.0] * B
    acc = [[0.0, 0.0, 0.0] for _ in range(B)]
    for y in range(img.height()):
        for x in range(img.width()):
            c = QColor(img.pixel(x, y))
            h, s, v = c.hsvHueF(), c.hsvSaturationF(), c.valueF()
            if h < 0 or v < 0.16:
                continue
            w = (s ** 1.6) * (0.35 + v)
            k = int(h * B) % B
            wsum[k] += w
            acc[k][0] += c.red() * w
            acc[k][1] += c.green() * w
            acc[k][2] += c.blue() * w
    if sum(wsum) < 4:
        return default
    order = sorted(range(B), key=lambda k: -(wsum[k] + 0.5 * (wsum[(k + 1) % B] + wsum[(k - 1) % B])))
    k1 = order[0]
    k2 = next((k for k in order[1:] if min(abs(k - k1), B - abs(k - k1)) * (360 / B) >= 40 and wsum[k] > wsum[k1] * 0.12), None)

    def col(k):
        c = QColor(int(acc[k][0] / wsum[k]), int(acc[k][1] / wsum[k]), int(acc[k][2] / wsum[k]))
        return QColor.fromHsvF(max(0.0, c.hsvHueF()), max(c.hsvSaturationF(), 0.6), max(c.valueF(), 0.95))

    a = col(k1)
    b = col(k2) if k2 is not None else QColor.fromHsvF((a.hsvHueF() + 0.11) % 1.0, a.hsvSaturationF(), 0.9)
    return a, b


# ====================================================================== desktop edge glow
class GlowStrip(QWidget):
    def __init__(self, overlay: "Glow", side: str) -> None:
        flags = (Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.Tool | Qt.WindowTransparentForInput
                 | Qt.WindowDoesNotAcceptFocus | Qt.NoDropShadowWindowHint)
        super().__init__(None, flags)
        self.setAttribute(Qt.WA_TranslucentBackground)
        self.setAttribute(Qt.WA_ShowWithoutActivating)
        self.setAttribute(Qt.WA_TransparentForMouseEvents)
        self.overlay = overlay
        self.side = side
        self.T = 70

    def paintEvent(self, _e) -> None:
        o = self.overlay
        if o.I < 0.01:
            return
        w, h, T = self.width(), self.height(), self.T
        if w <= 0 or h <= 0:
            return
        dpr = max(1.0, float(self.devicePixelRatioF() or 1.0))
        img = QImage(max(1, int(w * dpr)), max(1, int(h * dpr)), QImage.Format_ARGB32_Premultiplied)
        img.setDevicePixelRatio(dpr)  # paint in logical units, stay sharp on scaled displays
        img.fill(Qt.transparent)
        ip = QPainter(img)
        ip.setRenderHint(QPainter.Antialiasing)
        horiz = self.side in ("top", "bottom")
        L = w if horiz else h
        g = QLinearGradient(0, 0, L, 0) if horiz else QLinearGradient(0, 0, 0, L)
        off = {"top": 0.0, "right": 0.25, "bottom": 0.5, "left": 0.75}[self.side]
        for i in range(9):
            st = i / 8
            g.setColorAt(st, o.color_at(st * 0.25 + off + o.phase))
        full = QRectF(0, 0, w, h)
        ip.fillRect(full, g)
        # fall-off away from the screen edge: a bright line with a soft bloom
        if self.side == "top":
            f = QLinearGradient(0, 0, 0, T)
        elif self.side == "bottom":
            f = QLinearGradient(0, h, 0, h - T)
        elif self.side == "left":
            f = QLinearGradient(0, 0, T, 0)
        else:
            f = QLinearGradient(w, 0, w - T, 0)
        a = lambda v: QColor(0, 0, 0, int(255 * v))
        f.setColorAt(0.0, a(1.0))
        f.setColorAt(min(0.99, 2.5 / T), a(0.82))
        f.setColorAt(0.12, a(0.42))
        f.setColorAt(0.4, a(0.16))
        f.setColorAt(1.0, a(0.0))
        ip.setCompositionMode(QPainter.CompositionMode_DestinationIn)
        ip.fillRect(full, f)
        # rounded corners on the top and bottom strips (the side strips stop short of them)
        if horiz:
            for cx, ce in ((T, o.color_at(off + o.phase)), (w - T, o.color_at(off + 0.25 + o.phase))):
                sq = QRectF(0 if cx == T else w - T, 0, T, T)
                cy = T if self.side == "top" else 0
                ip.setCompositionMode(QPainter.CompositionMode_Clear)
                ip.fillRect(sq, Qt.transparent)
                ip.setCompositionMode(QPainter.CompositionMode_SourceOver)
                rg = QRadialGradient(QPointF(cx, cy), T)
                c0 = QColor(ce)
                for st, v in ((0.0, 0.0), (0.6, 0.16), (0.88, 0.42), (max(0.0, 1 - 2.5 / T), 0.82), (1.0, 1.0)):
                    cc = QColor(c0)
                    cc.setAlphaF(v)
                    rg.setColorAt(st, cc)
                path = QPainterPath()
                path.addEllipse(QPointF(cx, cy), T, T)
                clip = QPainterPath()
                clip.addRect(sq)
                ip.fillPath(path.intersected(clip), rg)
        ip.end()
        p = QPainter(self)
        p.setOpacity(min(1.0, o.I))
        p.drawImage(0, 0, img)
        p.end()


class Glow:
    """Lumn-style glow around every screen's edges while music plays."""

    def __init__(self, shell: "Shell") -> None:
        self.shell = shell
        self.strips: list[GlowStrip] = []
        self.I = 0.0
        self.phase = 0.0
        self.pulse = 0.0
        self.cols = (QColor(255, 70, 170), QColor(130, 80, 255))
        self.visible = False
        self.T = 70
        app = QGuiApplication.instance()
        app.screenAdded.connect(lambda *_: self.rebuild())
        app.screenRemoved.connect(lambda *_: self.rebuild())
        self.rebuild()

    def rebuild(self) -> None:
        for s in self.strips:
            s.hide()
            s.deleteLater()
        self.strips = []
        for scr in QGuiApplication.screens():
            g = scr.geometry()
            T = max(40, int(min(g.width(), g.height()) * 0.065))
            self.T = T
            for side in ("top", "bottom", "left", "right"):
                st = GlowStrip(self, side)
                st.T = T
                if side == "top":
                    st.setGeometry(g.x(), g.y(), g.width(), T)
                elif side == "bottom":
                    st.setGeometry(g.x(), g.y() + g.height() - T, g.width(), T)
                elif side == "left":
                    st.setGeometry(g.x(), g.y() + T, T, max(1, g.height() - 2 * T))
                else:
                    st.setGeometry(g.x() + g.width() - T, g.y() + T, T, max(1, g.height() - 2 * T))
                self.strips.append(st)
        self.visible = False

    def set_colours(self, a: QColor, b: QColor) -> None:
        self.cols = (a, b)

    def color_at(self, f: float) -> QColor:
        a, b = self.cols
        t = 0.5 + 0.5 * math.sin(f * math.tau)
        return QColor(int(a.red() + (b.red() - a.red()) * t), int(a.green() + (b.green() - a.green()) * t), int(a.blue() + (b.blue() - a.blue()) * t))

    def frame(self, dt: float, want: bool, audio: dict, intensity: float, react: bool) -> None:
        if audio.get("beat"):
            self.pulse = 1.0
        self.pulse = max(0.0, self.pulse - dt * 3.2)
        lvl = float(audio.get("level", 0.0) or 0.0)
        target = 0.0
        if want:
            target = intensity * ((0.5 + 0.35 * min(1.0, lvl * 1.3) + 0.35 * self.pulse) if react else 0.8)
        k = 1 - math.exp(-(9 if want else 4) * dt)
        self.I += (target - self.I) * k
        self.phase = (self.phase + dt * (0.02 + 0.03 * lvl)) % 1.0
        show = self.I > 0.01
        if show != self.visible:
            self.visible = show
            for s in self.strips:
                s.setVisible(show)
        if show:
            for s in self.strips:
                s.update()

    def hide(self) -> None:
        for s in self.strips:
            s.hide()
        self.visible = False


# ====================================================================== shell
class Bridge(QObject):
    sig = Signal(str, object)


class Shell:
    def __init__(self, engine, settings, open_settings: bool = True) -> None:
        self.app = QApplication.instance() or QApplication(sys.argv)
        self.app.setQuitOnLastWindowClosed(False)
        self.app.setApplicationName(APP_NAME)
        self.app.setApplicationDisplayName(APP_NAME)
        self.icon = make_icon()
        self.app.setWindowIcon(self.icon)
        try:
            self.icon.pixmap(256, 256).save(str(DATA_DIR / "oley.png"))
        except Exception:
            pass
        self.engine = engine
        self.settings = settings
        self.bridge = Bridge()
        self.bridge.sig.connect(self._dispatch)
        self.edge = Edge()
        self.cinema = Cinema(engine, settings, self.edge)
        self.glow = Glow(self)
        self.hotkey = None
        self._quitting = False
        self._settings_seen = False
        self._extra: dict = {}
        self.we_msg = ""
        self.track = None
        self._last = time.time()
        self._playing_since = 0.0
        engine.set_shell(self)
        self._apply_autostart(self.settings.get("system.autostart", False))
        self._start_hotkey()
        self._build_tray()
        self.fast = QTimer()
        self.fast.timeout.connect(self._tick)
        self.fast.start(33)
        self.slow = QTimer()
        self.slow.timeout.connect(self._slow)
        self.slow.start(1000)
        self.refresh_extra(full=True)
        if not self.edge.exe:
            log.warning("Microsoft Edge wasn't found; Cinema and the settings open in your default browser")
        if open_settings:
            QTimer.singleShot(250, self.open_settings)

    # ------------------------------------------------------------------ engine-facing (any thread)
    def attach(self, engine) -> None:
        self.engine = engine

    def call(self, name: str, *args) -> None:
        self.bridge.sig.emit(name, args)

    def extra_state(self) -> dict:
        return dict(self._extra)

    def _dispatch(self, name: str, args) -> None:
        h = getattr(self, "h_" + name, None)
        if h is None:
            log.debug("no handler for %s", name)
            return
        try:
            h(*args)
        except Exception:
            log.exception("handler %s failed", name)

    # ------------------------------------------------------------------ handlers
    def h_on_track(self, track, art=None) -> None:
        self.track = track
        if track is not None:
            self.glow.set_colours(*palette_from_bytes(art))
        self._update_tray()

    def h_on_setting(self, key: str, value) -> None:
        if key == "system.autostart":
            self._apply_autostart(bool(value))
        elif key == "cinema.hotkey":
            self._start_hotkey()
        elif key.startswith("cinema.screens") and self.cinema.on:
            self.cinema.close()
            QTimer.singleShot(1600, self.cinema.open)
        self._update_tray()
        self.refresh_extra()

    def h_settings_connected(self) -> None:
        self._settings_seen = True

    def h_settings_disconnected(self) -> None:
        QTimer.singleShot(1800, self._settings_closed)

    def h_cinema_connected(self, screen) -> None:
        pass

    def h_cinema_input(self, screen, kind="") -> None:
        self.cinema.input(screen, kind)
        self.refresh_extra()

    def h_open_settings(self, *_) -> None:
        self.open_settings()

    def h_quit(self, *_) -> None:
        self.quit()

    def h_cinema_toggle(self, *_) -> None:
        self.cinema.toggle()
        self.refresh_extra()

    def h_cinema_on(self, *_) -> None:
        self.cinema.open()
        self.refresh_extra()

    def h_cinema_off(self, *_) -> None:
        self.cinema.close()
        self.refresh_extra()

    def h_window_open(self, *_) -> None:
        self.open_window()

    def h_we_install(self, *_) -> None:
        res = wallpaper.install(self.settings.key)
        self.we_msg = res.get("msg", "")
        self.refresh_extra(full=True)

    def h_open_log(self, *_) -> None:
        winapi.open_path(str(DATA_DIR / "oley.log"))

    def h_open_data(self, *_) -> None:
        winapi.open_path(str(DATA_DIR))

    def h_open_custom(self, *_) -> None:
        p = CUSTOM_DIR
        p.mkdir(parents=True, exist_ok=True)
        winapi.open_path(str(p))

    def h_open_lyrics_folder(self, *_) -> None:
        p = DATA_DIR / "lyrics"
        p.mkdir(parents=True, exist_ok=True)
        winapi.open_path(str(p))

    def h_refresh(self, *_) -> None:
        self.refresh_extra(full=True)

    # ------------------------------------------------------------------ windows
    def _primary_box(self, w: int, h: int):
        scr = QGuiApplication.primaryScreen()
        g = scr.availableGeometry()
        return g.x() + (g.width() - w) // 2, g.y() + (g.height() - h) // 2, w, h

    def open_settings(self) -> None:
        if self.engine.server.count(("settings",)):
            hw = winapi.find_windows("Oley Settings")
            if hw:
                winapi.bring_front(hw[0])
                return
        x, y, w, h = self._primary_box(1180, 790)
        self.edge.launch("ui", self.engine.url("settings.html", role="settings"), x, y, w, h)

    def open_window(self) -> None:
        x, y, w, h = self._primary_box(1280, 720)
        self.edge.launch("window", self.engine.url("view.html", role="window"), x + 30, y + 30, w, h)

    def _settings_closed(self) -> None:
        if self._quitting or self.engine.server.count(("settings",)):
            return
        how = self.settings.get("system.close_button", "ask")
        if how == "quit":
            self.quit()
            return
        if how == "keep":
            self._tray_hint()
            return
        box = QMessageBox()
        box.setWindowTitle(APP_NAME)
        box.setWindowIcon(self.icon)
        box.setIcon(QMessageBox.Question)
        box.setText("Keep Oley running?")
        box.setInformativeText("Oley can keep the glow, the Cinema shortcut (Ctrl+Alt+L) and the wallpaper lyrics going from the tray.")
        keep = box.addButton("Keep running", QMessageBox.AcceptRole)
        quit_b = box.addButton("Quit Oley", QMessageBox.DestructiveRole)
        box.setDefaultButton(keep)
        cb = QCheckBox("Don't ask again")
        box.setCheckBox(cb)
        box.setWindowFlags(box.windowFlags() | Qt.WindowStaysOnTopHint)
        box.exec()
        clicked = box.clickedButton()
        choice = "quit" if clicked is not None and box.buttonRole(clicked) == QMessageBox.DestructiveRole else "keep"
        del quit_b, keep
        if cb.isChecked():
            self.engine.set("system.close_button", choice)
        if choice == "quit":
            self.quit()
        else:
            self._tray_hint()

    def _tray_hint(self) -> None:
        if not self.settings.get("system.tray_hint_shown", False):
            self.engine.set("system.tray_hint_shown", True)
            try:
                self.tray.showMessage(APP_NAME, "Oley is still running here. Ctrl+Alt+L turns Cinema on and off.", self.icon, 6000)
            except Exception:
                pass

    # ------------------------------------------------------------------ tray
    def _build_tray(self) -> None:
        self.tray = QSystemTrayIcon(self.icon)
        self.tray.setToolTip(CREDIT)
        m = QMenu()
        a = QAction(QIcon(self.icon), f"{CREDIT}  ·  {__version__}", m)
        a.setEnabled(False)
        m.addAction(a)
        m.addSeparator()
        self.a_now = QAction("Nothing playing")
        self.a_now.setEnabled(False)
        m.addAction(self.a_now)
        m.addSeparator()
        a = QAction("Open Oley", m)
        a.triggered.connect(self.open_settings)
        m.addAction(a)
        self.a_cinema = QAction("Cinema\tCtrl+Alt+L", m)
        self.a_cinema.setCheckable(True)
        self.a_cinema.triggered.connect(lambda: (self.cinema.toggle(), self.refresh_extra()))
        m.addAction(self.a_cinema)
        a = QAction("Open in a window", m)
        a.triggered.connect(self.open_window)
        m.addAction(a)
        mm = m.addMenu("Lyrics mode")
        self.mode_group = QActionGroup(mm)
        self.mode_actions = {}
        extra = {m["k"]: m["n"] for m in custom.scan(MODES)}
        for k in ["auto"] + MODES + list(extra):
            act = QAction(LABELS.get(k) or extra.get(k, k), mm)
            act.setCheckable(True)
            act.triggered.connect(lambda _=False, k=k: self.engine.set("mode", k))
            self.mode_group.addAction(act)
            mm.addAction(act)
            self.mode_actions[k] = act
        self.a_glow = QAction("Glow around the screen", m)
        self.a_glow.setCheckable(True)
        self.a_glow.triggered.connect(lambda on: self.engine.set("glow.desktop", bool(on)))
        m.addAction(self.a_glow)
        m.addSeparator()
        a = QAction("Play / Pause", m)
        a.triggered.connect(lambda: self.engine.action("play_pause"))
        m.addAction(a)
        a = QAction("Next", m)
        a.triggered.connect(lambda: self.engine.action("next"))
        m.addAction(a)
        m.addSeparator()
        a = QAction("Quit Oley", m)
        a.triggered.connect(self.quit)
        m.addAction(a)
        m.aboutToShow.connect(self._update_tray)
        self.menu = m
        self.tray.setContextMenu(m)
        self.tray.activated.connect(lambda r: self.open_settings() if r in (QSystemTrayIcon.Trigger, QSystemTrayIcon.DoubleClick) else None)
        self.tray.show()
        self._update_tray()

    def _update_tray(self) -> None:
        tr = self.track
        if tr:
            label = f"{tr.get('title', '')} — {tr.get('artist', '')}"
            self.a_now.setText(label[:60])
            self.tray.setToolTip(f"{APP_NAME} · {label}"[:120])
        else:
            self.a_now.setText("Nothing playing")
            self.tray.setToolTip(CREDIT)
        self.a_cinema.setChecked(self.cinema.on)
        self.a_glow.setChecked(bool(self.settings.get("glow.desktop", True)))
        cur = self.settings.get("mode", "auto")
        if cur in self.mode_actions:
            self.mode_actions[cur].setChecked(True)

    # ------------------------------------------------------------------ timers
    def _tick(self) -> None:
        now = time.time()
        dt = min(0.1, now - self._last)
        self._last = now
        g = self.settings.get("glow", {}) or {}
        playing = self.engine.playing
        if playing and not self._playing_since:
            self._playing_since = now
        elif not playing:
            self._playing_since = 0.0
        want = bool(g.get("desktop", True)) and playing and not self.cinema.on and not self._fullscreen
        self.glow.frame(dt, want, self.engine.audio_now() if playing else {}, float(g.get("intensity", 0.8) or 0.8), g.get("react", True) is not False)

    _fullscreen = False

    def _slow(self) -> None:
        self._fullscreen = winapi.fullscreen_app_running() and not self.cinema.on
        idle = winapi.idle_seconds()
        mins = float(self.settings.get("cinema.away_minutes", 0) or 0)
        if mins > 0 and not self.cinema.on and self.engine.playing and not self._fullscreen and idle >= mins * 60:
            self.cinema.open(auto=True)
            self.refresh_extra()
        elif self.cinema.on and self.cinema.auto and idle < 1.0 and time.time() - self.cinema.opened_at > 2:
            self.cinema.close()  # you're back
            self.refresh_extra()
        if self.cinema.on and time.time() - self.cinema.opened_at > 15 and self.cinema.windows_gone():
            self.cinema.close()  # someone closed the windows by hand
            self.refresh_extra()
        n = int(time.time())
        if n % 3 == 0:
            self.refresh_extra(full=(n % 15 == 0))

    def refresh_extra(self, full: bool = False) -> None:
        ex = dict(self._extra)
        ex["cinema"] = {"on": self.cinema.on, "auto": self.cinema.auto, "available": bool(self.edge.exe),
                        "hotkey": bool(self.hotkey and self.hotkey.ok), "hotkey_error": (self.hotkey.error if self.hotkey else "")}
        try:
            ex["displays"] = self.cinema.displays()
        except Exception as e:
            log.debug("displays failed: %s", e)
        ex["edge"] = bool(self.edge.exe)
        ex["shell"] = "qt"
        if full or "we" not in ex:
            try:
                ex["we"] = wallpaper.status()
            except Exception:
                ex["we"] = {"found": False}
            ex["autostart"] = winapi.get_autostart()
        if "we" in ex:
            ex["we"] = dict(ex["we"], msg=self.we_msg)
        changed = ex != self._extra
        self._extra = ex
        if changed:
            self.engine.state_changed()
        self._update_tray()

    # ------------------------------------------------------------------ system
    def _start_hotkey(self) -> None:
        if self.hotkey:
            self.hotkey.stop()
            self.hotkey = None
        if self.settings.get("cinema.hotkey", True):
            self.hotkey = winapi.Hotkey(winapi.VK["L"], lambda: self.call("cinema_toggle"))
            self.hotkey.start()
            self.hotkey.ready.wait(2)

    def _apply_autostart(self, on: bool) -> None:
        try:
            cmd = launch_command("--tray")
            winapi.set_autostart(on, cmd)
        except Exception as e:
            log.warning("autostart change failed: %s", e)

    def quit(self) -> None:
        if self._quitting:
            return
        self._quitting = True
        log.info("quitting")
        # whatever happens on the way out, the process ends within 4 seconds
        t = threading.Timer(4.0, lambda: os._exit(0))
        t.daemon = True
        t.start()
        try:
            self.fast.stop()
            self.slow.stop()
            self.glow.hide()
            if self.hotkey:
                self.hotkey.stop()
            winapi.keep_awake(False)
            self.cinema.on = False
            self.engine.send_cmd("close", roles=("cinema", "settings", "window"))
            winapi.kill_with(str(EDGE_DIR), grace=0.8)
            self.tray.hide()
            self.engine.stop()
            self.engine.join(1.5)
        except Exception:
            log.exception("error while quitting")
        self.app.quit()

    def exec(self) -> int:
        code = self.app.exec()
        log.info("bye")
        return 0 if code is None else int(code)
