@echo off
echo.
echo   Stopping LearnQuest...

set FOUND=0

REM Kill Node.js server on port 5000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
    if not errorlevel 1 (
        echo   Stopped server (PID: %%a)
        set FOUND=1
    )
)

if "%FOUND%"=="0" (
    echo   LearnQuest does not appear to be running.
) else (
    echo   LearnQuest stopped. Safe to remove USB.
)

echo.
pause
