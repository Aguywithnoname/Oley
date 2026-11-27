"""Listens to what the PC is playing (WASAPI loopback, nothing is recorded or saved) and turns it into
levels, 24 frequency bands and beats for the glow and the visuals."""
from __future__ import annotations

import logging
import math
import threading
import time

log = logging.getLogger("oley.audio")
NB = 24


class AudioAnalyzer(threading.Thread):
    def __init__(self, enabled=lambda: True) -> None:
        super().__init__(name="oley-audio", daemon=True)
        self.enabled = enabled
        self.running = True
        self.ok = False
        self.error = ""
        self.device = ""
        self.beat_id = 0
        self.latest = {"level": 0.0, "bass": 0.0, "mid": 0.0, "high": 0.0, "bands": [0.0] * NB, "beat": 0}
        self._last_data = 0.0

    def stop(self) -> None:
        self.running = False

    def run(self) -> None:
        try:
            import numpy as np  # noqa: F401
            import pyaudiowpatch as pyaudio  # type: ignore
        except Exception as e:
            self.error = "Audio reactivity is off: PyAudioWPatch isn't installed"
            log.warning("%s (%s)", self.error, e)
            return
        while self.running:
            if not self.enabled():
                self.ok = False
                time.sleep(1)
                continue
            try:
                self._capture(pyaudio)
            except Exception as e:
                self.ok = False
                self.error = f"Audio capture stopped: {e}"
                log.warning(self.error)
                time.sleep(3)

    def _capture(self, pyaudio) -> None:
        import numpy as np
        p = pyaudio.PyAudio()
        stream = None
        try:
            wasapi = p.get_host_api_info_by_type(pyaudio.paWASAPI)
            spk = p.get_device_info_by_index(wasapi["defaultOutputDevice"])
            if not spk.get("isLoopbackDevice"):
                found = None
                for lb in p.get_loopback_device_info_generator():
                    if spk["name"] in lb["name"]:
                        found = lb
                        break
                if found is None:
                    raise RuntimeError("no loopback device for " + spk["name"])
                spk = found
            rate = int(spk["defaultSampleRate"])
            ch = max(1, int(spk["maxInputChannels"]))
            stream = p.open(format=pyaudio.paFloat32, channels=ch, rate=rate, input=True,
                            input_device_index=spk["index"], frames_per_buffer=512)
            self.device = spk["name"]
            self.ok = True
            self.error = ""
            log.info("listening to %s (%d Hz, %d ch)", self.device, rate, ch)
            N = 2048
            ring = np.zeros(N, dtype=np.float32)
            win = np.hanning(N).astype(np.float32)
            freqs = np.fft.rfftfreq(N, 1.0 / rate)
            edges = np.geomspace(32, min(16000, rate / 2 - 1), NB + 1)
            idx = [(int(np.searchsorted(freqs, edges[i])), max(int(np.searchsorted(freqs, edges[i + 1])), int(np.searchsorted(freqs, edges[i])) + 1)) for i in range(NB)]
            peak = np.full(NB, 1e-4, dtype=np.float64)
            lvl_peak = 1e-3
            bass_avg = 1e-4
            prev_bass = 0.0
            last_beat = 0.0
            last_dev_check = time.time()
            dev_name = self.device
            while self.running and self.enabled():
                avail = stream.get_read_available()
                if avail >= 256:
                    data = stream.read(min(avail, 4096), exception_on_overflow=False)
                    x = np.frombuffer(data, dtype=np.float32)
                    if ch > 1:
                        x = x[: (len(x) // ch) * ch].reshape(-1, ch).mean(axis=1)
                    n = len(x)
                    if n >= N:
                        ring[:] = x[-N:]
                    else:
                        ring[:-n] = ring[n:]
                        ring[-n:] = x
                    self._last_data = time.time()
                    spec = np.abs(np.fft.rfft(ring * win))
                    bands = np.array([spec[a:b].mean() for a, b in idx], dtype=np.float64)
                    peak = np.maximum(bands, peak * 0.9985)
                    norm = np.clip(np.power(bands / np.maximum(peak, 1e-6), 0.8), 0, 1)
                    rms = float(np.sqrt(np.mean(ring[-1024:] ** 2)))
                    lvl_peak = max(rms, lvl_peak * 0.999)
                    level = min(1.0, rms / max(lvl_peak, 1e-5))
                    bass_e = float(bands[:4].mean())
                    bass_avg = bass_avg * 0.96 + bass_e * 0.04
                    now = time.time()
                    beat = 0
                    if bass_e > bass_avg * 1.45 and bass_e > prev_bass * 1.05 and now - last_beat > 0.24 and level > 0.08:
                        last_beat = now
                        self.beat_id += 1
                        beat = self.beat_id
                    prev_bass = bass_e
                    self.latest = {
                        "level": round(level, 3),
                        "bass": round(float(norm[:4].mean()), 3),
                        "mid": round(float(norm[4:14].mean()), 3),
                        "high": round(float(norm[14:].mean()), 3),
                        "bands": [round(float(v), 3) for v in norm],
                        "beat": beat,
                    }
                else:
                    if time.time() - self._last_data > 0.25:
                        # nothing playing: loopback goes quiet, so fade out
                        L = self.latest
                        self.latest = {
                            "level": round(L["level"] * 0.9, 3), "bass": round(L["bass"] * 0.9, 3), "mid": round(L["mid"] * 0.9, 3),
                            "high": round(L["high"] * 0.9, 3), "bands": [round(v * 0.9, 3) for v in L["bands"]], "beat": 0,
                        }
                    time.sleep(0.01)
                if time.time() - last_dev_check > 3:
                    last_dev_check = time.time()
                    try:
                        cur = p.get_device_info_by_index(p.get_host_api_info_by_type(pyaudio.paWASAPI)["defaultOutputDevice"])["name"]
                        if cur not in dev_name:
                            log.info("default output changed to %s; reopening", cur)
                            break
                    except Exception:
                        pass
        finally:
            self.ok = False
            try:
                if stream is not None:
                    stream.stop_stream()
                    stream.close()
            except Exception:
                pass
            try:
                p.terminate()
            except Exception:
                pass


class MockAudio(threading.Thread):
    """Synthetic beat at 118 BPM (testing)."""

    def __init__(self, enabled=lambda: True) -> None:
        super().__init__(name="oley-audio-mock", daemon=True)
        self.running = True
        self.ok = True
        self.error = ""
        self.device = "Test signal"
        self.beat_id = 0
        self.latest = {"level": 0.0, "bass": 0.0, "mid": 0.0, "high": 0.0, "bands": [0.0] * NB, "beat": 0}

    def stop(self) -> None:
        self.running = False

    def run(self) -> None:
        bl = 60 / 118
        last = -1
        t0 = time.time()
        while self.running:
            t = time.time() - t0
            ph = (t % bl) / bl
            kick = math.exp(-ph * 7)
            b = int(t / bl)
            beat = 0
            if b != last:
                last = b
                self.beat_id += 1
                beat = self.beat_id
            bands = [max(0.0, min(1.0, (0.55 - i * 0.017) * (0.6 + 0.4 * math.sin(t * 3 + i)) + (kick * 0.45 if i < 5 else kick * 0.1))) for i in range(NB)]
            self.latest = {"level": round(0.5 + 0.3 * kick, 3), "bass": round(0.35 + 0.6 * kick, 3), "mid": 0.45, "high": 0.3, "bands": [round(v, 3) for v in bands], "beat": beat}
            time.sleep(1 / 60)


class NullAudio:
    ok = False
    error = "Audio reactivity needs Windows"
    device = ""
    beat_id = 0
    latest = {"level": 0.0, "bass": 0.0, "mid": 0.0, "high": 0.0, "bands": [0.0] * NB, "beat": 0}

    def start(self) -> None: ...
    def stop(self) -> None: ...
