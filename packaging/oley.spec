# PyInstaller recipe for the installed Oley: one folder, Oley.exe with no console window.
# Built by .github/workflows/release.yml; to build by hand on Windows:
#   pip install -r requirements.txt PyAudioWPatch onnxruntime Pillow pyinstaller
#   pyinstaller packaging/oley.spec --noconfirm
import os
from PyInstaller.utils.hooks import collect_all, collect_dynamic_libs, collect_submodules

ROOT = os.path.abspath(os.path.join(SPECPATH, '..'))

datas = [
    (os.path.join(ROOT, 'web'), 'web'),
    (os.path.join(ROOT, 'custom-modes'), 'custom-modes'),
    (os.path.join(ROOT, 'oley.ico'), '.'),
    (os.path.join(ROOT, 'LICENSE'), '.'),
    (os.path.join(ROOT, 'NOTICE.md'), '.'),
    (os.path.join(ROOT, 'MAKING-MODES.md'), '.'),
]
binaries = []
hidden = []

# Windows' media controls (what's playing on Spotify) come through the winrt projection packages
for pkg in ('winrt', 'winrt.runtime', 'winrt.system', 'winrt.windows.foundation', 'winrt.windows.foundation.collections',
            'winrt.windows.media.control', 'winrt.windows.storage.streams'):
    try:
        d, b, h = collect_all(pkg)
        datas += d; binaries += b; hidden += h + [pkg]
    except Exception:
        pass
try:
    hidden += collect_submodules('winrt')
except Exception:
    pass
# beat detection and the AI cut-out are optional: bundled when installed, skipped when not
# (PyInstaller's own hooks cover onnxruntime and Pillow; this makes sure their DLLs come along)
for pkg in ('pyaudiowpatch', 'onnxruntime', 'PIL'):
    try:
        binaries += collect_dynamic_libs(pkg)
        hidden.append(pkg)
    except Exception:
        pass

a = Analysis(
    [os.path.join(ROOT, 'Oley.pyw')],
    pathex=[ROOT],
    binaries=binaries,
    datas=datas,
    hiddenimports=hidden + ['oley.app', 'oley.engine', 'oley.shell'],
    excludes=['tkinter', 'winsdk', 'matplotlib', 'IPython', 'pytest'],
    noarchive=False,
)
pyz = PYZ(a.pure)
exe = EXE(
    pyz, a.scripts, [],
    exclude_binaries=True,
    name='Oley',
    icon=os.path.join(ROOT, 'oley.ico'),
    console=False,
    disable_windowed_traceback=False,
    upx=False,
    version=os.path.join(SPECPATH, 'version.txt') if os.path.exists(os.path.join(SPECPATH, 'version.txt')) else None,
)
coll = COLLECT(exe, a.binaries, a.datas, strip=False, upx=False, name='Oley')
