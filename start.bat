@echo off
title LearnQuest - Offline K-8 Tutoring
echo.
echo   LearnQuest - Offline K-8 Tutoring
echo   ======================================
echo.

REM Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   [ERROR] Node.js is required. Install from https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do echo   [OK] Node.js %%v

REM Check Ollama
where ollama >nul 2>&1
if %errorlevel% neq 0 (
    echo   [ERROR] Ollama is required. Install from https://ollama.com/download
    pause
    exit /b 1
)
echo   [OK] Ollama found

REM Check that learnquest-app directory exists
if not exist "%~dp0learnquest-app\server.js" (
    echo   [ERROR] server.js not found in learnquest-app directory.
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "%~dp0learnquest-app\node_modules" (
    echo   [SETUP] Installing dependencies...
    cd /d "%~dp0learnquest-app"
    call npm install --production
    if %errorlevel% neq 0 (
        echo   [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
    echo   [OK] Dependencies installed
)

REM Start Ollama if not running
curl -s http://localhost:11434/ >nul 2>&1
if %errorlevel% neq 0 (
    echo   Starting Ollama...
    start /b "" ollama serve >nul 2>&1
    timeout /t 5 /nobreak >nul
)

REM Verify Ollama is responding
curl -s http://localhost:11434/ >nul 2>&1
if %errorlevel% equ 0 (
    echo   [OK] Ollama running
) else (
    echo   [WARN] Ollama may not have started. AI tutoring may not work.
)

REM Check for phi3 model
ollama list 2>nul | findstr /i "phi3" >nul
if %errorlevel% neq 0 (
    echo   Downloading AI model (2.3 GB)... This is a one-time download.
    ollama pull phi3
)
echo   [OK] AI model ready

echo.
echo   Starting LearnQuest server...
echo   Open http://localhost:5000 in your browser
echo   Press Ctrl+C to stop
echo.

cd /d "%~dp0learnquest-app"
start http://localhost:5000
node server.js
