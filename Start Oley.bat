@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Oley

rem ---- find Python 3.10 or newer (3.13 preferred)
set "PY="
for %%P in ("py -3.13" "py -3.12" "python" "py -3") do (
  if not defined PY (
    %%~P -c "import sys; sys.exit(0 if sys.version_info[:2] >= (3, 10) else 1)" >nul 2>&1 && set "PY=%%~P"
  )
)
if not defined PY (
  echo.
  echo  Oley needs Python 3.10 or newer.
  echo  Install "Python 3.13" from the Microsoft Store, then run this file again.
  echo.
  start "" "ms-windows-store://pdp/?productid=9PNRBTZXMB4Z"
  pause
  exit /b 1
)

rem ---- first run: a private Python environment inside this folder
if not exist ".venv\Scripts\pythonw.exe" (
  echo Setting up Oley for the first time. This downloads about 150 MB and takes a few minutes...
  %PY% -m venv .venv
  if errorlevel 1 (
    echo Could not create the Python environment.
    pause
    exit /b 1
  )
)

rem ---- install or update the libraries when requirements.txt changes
fc /b requirements.txt ".venv\.ready" >nul 2>&1
if errorlevel 1 (
  echo Installing what Oley needs...
  ".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -q --upgrade pip
  ".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -r requirements.txt
  if errorlevel 1 (
    echo.
    echo Installing failed. Check your internet connection and run this file again.
    pause
    exit /b 1
  )
  ".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -q PyAudioWPatch
  if errorlevel 1 echo Beat detection is off because PyAudioWPatch did not install. Everything else works.
  ".venv\Scripts\python.exe" -m pip install --disable-pip-version-check -q onnxruntime Pillow
  if errorlevel 1 echo AI cut-outs for Polyester are off because onnxruntime did not install. Everything else works.
  copy /y requirements.txt ".venv\.ready" >nul
  powershell -NoProfile -ExecutionPolicy Bypass -File "tools\make-shortcut.ps1" -App "%~dp0." >nul 2>&1
)

start "" ".venv\Scripts\pythonw.exe" "%~dp0Oley.pyw"
endlocal
