# Adds "Oley" to the Start menu so you can search for it.
param([string]$App)
$App = [IO.Path]::GetFullPath($App)
$ws = New-Object -ComObject WScript.Shell
$lnk = Join-Path ([Environment]::GetFolderPath('Programs')) 'Oley.lnk'
$s = $ws.CreateShortcut($lnk)
$s.TargetPath = Join-Path $App '.venv\Scripts\pythonw.exe'
$s.Arguments = '"' + (Join-Path $App 'Oley.pyw') + '"'
$s.WorkingDirectory = $App
$s.IconLocation = (Join-Path $App 'oley.ico') + ',0'
$s.Description = 'Oley - lyrics in many shapes for Spotify'
$s.Save()
