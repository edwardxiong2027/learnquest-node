; =============================================================================
; LearnQuest - Inno Setup Installer Script
; =============================================================================
;
; This script creates a professional Windows installer for LearnQuest.
;
; PREREQUISITES:
;   - Inno Setup 6.0 or later (https://jrsoftware.org/isinfo.php)
;   - The build/learnquest/ directory must be populated by build-windows.sh
;   - icon.ico must exist in this directory (installer-assets/)
;
; USAGE:
;   1. Open this file in Inno Setup Compiler
;   2. Click Build > Compile
;   3. The installer will be created in ../build/
;
; =============================================================================

[Setup]
; Application identity
AppName=LearnQuest
AppVersion=1.0.0
AppVerName=LearnQuest 1.0.0
AppPublisher=LearnQuest
AppPublisherURL=https://learnquest2026.web.app/
AppSupportURL=https://github.com/edwardxiong2027/LearnQuest-Node
AppUpdatesURL=https://github.com/edwardxiong2027/LearnQuest-Node/releases
AppCopyright=Copyright (c) 2026 LearnQuest

; Installation settings
DefaultDirName={autopf}\LearnQuest
DefaultGroupName=LearnQuest
AllowNoIcons=yes
DisableProgramGroupPage=yes

; Output settings
OutputBaseFilename=LearnQuest-Setup
OutputDir=..\build
Compression=lzma2/ultra64
SolidCompression=yes

; Visual settings
SetupIconFile=icon.ico
UninstallDisplayIcon={app}\icon.ico
WizardStyle=modern
WizardSizePercent=110

; Permissions - install for current user without admin rights
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

; License
LicenseFile=license.txt

; Minimum Windows version (Windows 10+)
MinVersion=10.0

; Uninstall settings
UninstallDisplayName=LearnQuest

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Messages]
WelcomeLabel1=Welcome to LearnQuest Setup
WelcomeLabel2=This will install LearnQuest, an offline K-8 tutoring platform powered by local AI, on your computer.%n%nLearnQuest requires Ollama to be installed for AI tutoring features. If you don't have Ollama yet, the application will guide you through installing it on first launch.%n%nClick Next to continue.

[Files]
; Copy all application files from the build directory
Source: "..\build\learnquest\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Dirs]
; Ensure the database directory exists and is writable
Name: "{app}\database"; Permissions: users-modify

[Icons]
; Start menu shortcut
Name: "{group}\LearnQuest"; Filename: "{app}\LearnQuest.bat"; IconFilename: "{app}\icon.ico"; Comment: "Launch LearnQuest offline tutoring"

; Desktop shortcut (optional via task)
Name: "{autodesktop}\LearnQuest"; Filename: "{app}\LearnQuest.bat"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon; Comment: "Launch LearnQuest offline tutoring"

; Start menu uninstall shortcut
Name: "{group}\Uninstall LearnQuest"; Filename: "{uninstallexe}"

[Tasks]
Name: "desktopicon"; Description: "Create a &desktop shortcut"; GroupDescription: "Additional shortcuts:"; Flags: checked

[Run]
; Option to launch after install
Filename: "{app}\LearnQuest.bat"; Description: "Launch LearnQuest now"; Flags: nowait postinstall skipifsilent shellexec

[UninstallDelete]
; Clean up database and any generated files on uninstall
Type: filesandordirs; Name: "{app}\database\learnquest.db"
Type: filesandordirs; Name: "{app}\database\*.db-journal"
Type: filesandordirs; Name: "{app}\logs"

[Code]
// Custom code to check for Node.js during install
function NodeJsInstalled(): Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec('cmd.exe', '/c where node', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

function OllamaInstalled(): Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec('cmd.exe', '/c where ollama', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if CurPageID = wpFinished then
  begin
    if not OllamaInstalled() then
    begin
      MsgBox('Note: Ollama is not currently installed on this computer.' + #13#10 + #13#10 +
             'LearnQuest requires Ollama for AI tutoring features.' + #13#10 +
             'When you first launch LearnQuest, it will guide you to install Ollama.' + #13#10 + #13#10 +
             'You can also install it now from: https://ollama.com/download',
             mbInformation, MB_OK);
    end;
  end;
end;
