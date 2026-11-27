; Inno Setup recipe for Oley-Setup.exe. Installs for the current user only (no admin prompt),
; into %LOCALAPPDATA%\Programs\Oley, with a Start menu entry and an uninstaller.
; Built by .github/workflows/release.yml after PyInstaller has made dist\Oley.

#ifndef AppVersion
  #define AppVersion "2.1.0"
#endif

[Setup]
AppId={{6E0F2A3B-8C41-4D9E-9B7A-0E1E5C0A1E7D}
AppName=Oley
AppVersion={#AppVersion}
AppVerName=Oley {#AppVersion}
AppPublisher=nxrute
AppPublisherURL=https://github.com/Aguywithnoname/Oley
AppSupportURL=https://github.com/Aguywithnoname/Oley/issues
AppUpdatesURL=https://github.com/Aguywithnoname/Oley/releases
DefaultDirName={localappdata}\Programs\Oley
DisableProgramGroupPage=yes
DisableDirPage=auto
PrivilegesRequired=lowest
OutputDir=..\dist
OutputBaseFilename=Oley-Setup-{#AppVersion}
SetupIconFile=..\oley.ico
UninstallDisplayIcon={app}\Oley.exe
UninstallDisplayName=Oley
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
CloseApplications=force
RestartApplications=no

[Tasks]
Name: "desktopicon"; Description: "Put Oley on the desktop"; Flags: unchecked

[Files]
Source: "..\dist\Oley\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[InstallDelete]
; a new version replaces the old app files completely (your settings live elsewhere and are kept)
Type: filesandordirs; Name: "{app}\_internal"

[Icons]
Name: "{autoprograms}\Oley"; Filename: "{app}\Oley.exe"; Comment: "Lyrics in many shapes for Spotify"
Name: "{autodesktop}\Oley"; Filename: "{app}\Oley.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\Oley.exe"; Description: "Start Oley now"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "{sys}\taskkill.exe"; Parameters: "/f /im Oley.exe"; Flags: runhidden; RunOnceId: "StopOley"
Filename: "{sys}\reg.exe"; Parameters: "delete ""HKCU\Software\Microsoft\Windows\CurrentVersion\Run"" /v Oley /f"; Flags: runhidden; RunOnceId: "NoAutostart"
