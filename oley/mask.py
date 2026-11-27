"""Subject cut-outs for the edit modes (Polyester): finds the main subject of an album cover with a
salient-object model (IS-Net, via onnxruntime) so the renderer can put titles behind it.

Optional. It needs onnxruntime, numpy and Pillow, and downloads the model (about 170 MB) the first
time a page asks for a cut-out. Without them the renderer uses its own quick guess instead.
The model is the "isnet-general-use" release published by the rembg project."""
from __future__ import annotations

import hashlib
import io
import logging
import threading
import urllib.request
from pathlib import Path
from typing import Optional

from .paths import DATA_DIR

log = logging.getLogger("oley.mask")

MODEL_URL = "https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx"
MODEL_FILE = "isnet-general-use.onnx"
SIZE = 1024
MEAN = (0.485, 0.456, 0.406)
STD = (1.0, 1.0, 1.0)
MIN_MODEL_BYTES = 20_000_000


def available() -> bool:
    try:
        import numpy  # noqa: F401
        import onnxruntime  # noqa: F401
        from PIL import Image  # noqa: F401
        return True
    except Exception:
        return False


class MaskService:
    def __init__(self, models_dir: Optional[Path] = None, cache_dir: Optional[Path] = None) -> None:
        self.models = Path(models_dir or DATA_DIR / "models")
        self.cache = Path(cache_dir or DATA_DIR / "masks")
        self.sess = None
        self.failed = False
        self.lock = threading.Lock()

    # the model file, downloaded once
    def _model(self) -> Optional[Path]:
        path = self.models / MODEL_FILE
        if path.exists() and path.stat().st_size > MIN_MODEL_BYTES:
            return path
        self.models.mkdir(parents=True, exist_ok=True)
        part = path.with_suffix(".part")
        log.info("downloading the cut-out model (about 170 MB, once)")
        req = urllib.request.Request(MODEL_URL, headers={"User-Agent": "Oley"})
        with urllib.request.urlopen(req, timeout=30) as r, open(part, "wb") as f:
            while True:
                chunk = r.read(1 << 20)
                if not chunk:
                    break
                f.write(chunk)
        if part.stat().st_size < MIN_MODEL_BYTES:
            part.unlink(missing_ok=True)
            raise RuntimeError("model download was incomplete")
        part.replace(path)
        log.info("cut-out model ready")
        return path

    def _session(self):
        if self.sess is not None or self.failed:
            return self.sess
        try:
            import onnxruntime as ort
            path = self._model()
            so = ort.SessionOptions()
            so.intra_op_num_threads = 2   # stay light next to games and the player
            so.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            self.sess = ort.InferenceSession(str(path), so, providers=["CPUExecutionProvider"])
        except Exception as e:
            log.warning("cut-outs are off: %s", e)
            self.failed = True
            self.sess = None
        return self.sess

    @staticmethod
    def prepare(img):
        """cover (PIL image) -> network input, the way the model was trained"""
        import numpy as np
        from PIL import Image
        im = img.convert("RGB").resize((SIZE, SIZE), Image.LANCZOS)
        a = np.asarray(im).astype(np.float32)
        a = a / max(1.0, float(a.max()))
        a = (a - np.array(MEAN, dtype=np.float32)) / np.array(STD, dtype=np.float32)
        return a.transpose(2, 0, 1)[None].astype(np.float32)

    @staticmethod
    def finish(out, size) -> bytes:
        """network output -> grey PNG the size of the cover (white = subject)"""
        import numpy as np
        from PIL import Image
        pred = out[:, 0, :, :] if out.ndim == 4 else out
        pred = np.squeeze(pred).astype(np.float32)
        lo, hi = float(pred.min()), float(pred.max())
        pred = (pred - lo) / max(1e-6, hi - lo)
        m = Image.fromarray((pred * 255).astype(np.uint8), "L")
        w, h = size
        s = min(1.0, 1024 / max(w, h))
        m = m.resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS)
        buf = io.BytesIO()
        m.save(buf, "PNG", optimize=True)
        return buf.getvalue()

    def make(self, data: bytes) -> Optional[bytes]:
        """cover bytes -> mask PNG bytes (cached on disk), or None when cut-outs aren't possible"""
        if not data:
            return None
        key = hashlib.sha1(data).hexdigest()[:24]
        hit = self.cache / f"{key}.png"
        if hit.exists():
            try:
                return hit.read_bytes()
            except OSError:
                pass
        with self.lock:
            sess = self._session()
            if sess is None:
                return None
            try:
                from PIL import Image
                img = Image.open(io.BytesIO(data))
                x = self.prepare(img)
                out = sess.run(None, {sess.get_inputs()[0].name: x})[0]
                png = self.finish(out, img.size)
            except Exception as e:
                log.warning("cut-out failed: %s", e)
                return None
        try:
            self.cache.mkdir(parents=True, exist_ok=True)
            hit.write_bytes(png)
        except OSError:
            pass
        return png
