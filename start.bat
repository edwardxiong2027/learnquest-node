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

REM Detect which AI model to use
REM Priority: phi3:medium (best quality) > llama3.2:3b > phi3 (mini)
set LEARNQUEST_MODEL=
for /f "tokens=*" %%m in ('ollama list 2^>nul') do (
    echo %%m | findstr /i "phi3:medium" >nul && if not defined LEARNQUEST_MODEL set LEARNQUEST_MODEL=phi3:medium
)
if not defined LEARNQUEST_MODEL (
    for /f "tokens=*" %%m in ('ollama list 2^>nul') do (
        echo %%m | findstr /i "llama3.2:3b" >nul && if not defined LEARNQUEST_MODEL set LEARNQUEST_MODEL=llama3.2:3b
    )
)
if not defined LEARNQUEST_MODEL (
    for /f "tokens=*" %%m in ('ollama list 2^>nul') do (
        echo %%m | findstr /i "phi3" >nul && if not defined LEARNQUEST_MODEL set LEARNQUEST_MODEL=phi3
    )
)
if not defined LEARNQUEST_MODEL (
    echo   [WARN] No AI model found. Trying to pull llama3.2:3b...
    ollama pull llama3.2:3b
    if %errorlevel% equ 0 (
        set LEARNQUEST_MODEL=llama3.2:3b
    ) else (
        echo   [WARN] No AI model available. AI tutoring will not work.
        echo          Run the install script from the USB drive first.
        set LEARNQUEST_MODEL=phi3
    )
)
echo   [OK] AI model: %LEARNQUEST_MODEL%

echo.
echo   Starting LearnQuest server...
echo   Using model: %LEARNQUEST_MODEL%
echo   Open http://localhost:5000 in your browser
echo   Press Ctrl+C to stop
echo.

cd /d "%~dp0learnquest-app"
start http://localhost:5000
node server.js
