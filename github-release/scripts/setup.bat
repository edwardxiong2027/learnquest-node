@echo off
REM ===========================================================================
REM LearnQuest Setup Script (Windows)
REM ===========================================================================
REM This script checks prerequisites, verifies Ollama is installed, downloads
REM the Phi-3 AI model, and installs Node.js dependencies.
REM
REM Usage:
REM   scripts\setup.bat
REM ===========================================================================

echo.
echo ============================================
echo   LearnQuest Setup
echo   Offline K-8 Tutoring Platform
echo ============================================
echo.

REM ------------------------------------------------------------------
REM Step 1: Check Node.js
REM ------------------------------------------------------------------
echo [1/5] Checking Node.js...

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo   Node.js is not installed.
    echo   Please install Node.js v18 or later from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo   Found Node.js %NODE_VERSION%
echo   OK
echo.

REM ------------------------------------------------------------------
REM Step 2: Check Ollama
REM ------------------------------------------------------------------
echo [2/5] Checking Ollama...

where ollama >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo   Ollama is not installed.
    echo   Please download and install Ollama from: https://ollama.com/download
    echo.
    echo   After installing Ollama, run this setup script again.
    echo.
    pause
    exit /b 1
)

echo   Ollama found.
echo   OK
echo.

REM ------------------------------------------------------------------
REM Step 3: Start Ollama if not running
REM ------------------------------------------------------------------
echo [3/5] Starting Ollama...

curl -s http://localhost:11434/ >nul 2>&1
if %errorlevel% neq 0 (
    echo   Starting Ollama serve in background...
    start /B ollama serve >nul 2>&1
    timeout /t 5 /nobreak >nul
)

curl -s http://localhost:11434/ >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo   Could not start Ollama automatically.
    echo   Please open a separate terminal and run: ollama serve
    echo   Then run this setup script again.
    echo.
    pause
    exit /b 1
)

echo   Ollama is running.
echo   OK
echo.

REM ------------------------------------------------------------------
REM Step 4: Download Phi-3 model
REM ------------------------------------------------------------------
echo [4/5] Checking AI model (Phi-3)...

ollama list 2>nul | findstr /i "phi3" >nul 2>&1
if %errorlevel% neq 0 (
    echo   Downloading Phi-3 model (~2.3 GB)...
    echo   This is a one-time download. Please be patient.
    echo.
    ollama pull phi3
    if %errorlevel% neq 0 (
        echo.
        echo   Failed to download the Phi-3 model.
        echo   Please ensure you have an internet connection and try again:
        echo     ollama pull phi3
        echo.
        pause
        exit /b 1
    )
    echo.
    echo   Phi-3 model downloaded successfully.
) else (
    echo   Phi-3 model is already downloaded.
)
echo   OK
echo.

REM ------------------------------------------------------------------
REM Step 5: Install Node.js dependencies
REM ------------------------------------------------------------------
echo [5/5] Installing Node.js dependencies...

cd /d "%~dp0.."
call npm install

if %errorlevel% neq 0 (
    echo.
    echo   Failed to install dependencies.
    echo   Please try running 'npm install' manually in the project directory.
    pause
    exit /b 1
)
echo   OK
echo.

REM ------------------------------------------------------------------
REM Done
REM ------------------------------------------------------------------
echo ============================================
echo   Setup complete!
echo ============================================
echo.
echo   To start LearnQuest:
echo.
echo     npm start
echo.
echo   Or use the start script:
echo.
echo     scripts\start.bat
echo.
echo   Then open http://localhost:5000 in your browser.
echo.
echo   Default teacher login:
echo     Name: teacher
echo     PIN:  1234
echo.
echo ============================================
echo.
pause
