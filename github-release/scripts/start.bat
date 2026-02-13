@echo off
REM ===========================================================================
REM LearnQuest Start Script (Windows)
REM ===========================================================================
REM Starts the Ollama AI engine and the LearnQuest Node.js server,
REM then opens the browser.
REM
REM Usage:
REM   scripts\start.bat
REM ===========================================================================

echo.
echo ============================================
echo   Starting LearnQuest...
echo ============================================
echo.

REM ------------------------------------------------------------------
REM Step 1: Start Ollama if not running
REM ------------------------------------------------------------------
echo [1/3] Checking Ollama...

REM Optionally point Ollama models to a local directory
if exist "%~dp0..\ollama_models" (
    set OLLAMA_MODELS=%~dp0..\ollama_models
    echo   Using local model storage: %OLLAMA_MODELS%
)

curl -s http://localhost:11434/ >nul 2>&1
if %errorlevel% neq 0 (
    where ollama >nul 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo   Ollama is not installed. Please run the setup script first:
        echo     scripts\setup.bat
        echo.
        pause
        exit /b 1
    )

    echo   Starting Ollama serve...
    start /B ollama serve >nul 2>&1
    timeout /t 5 /nobreak >nul

    curl -s http://localhost:11434/ >nul 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo   Failed to start Ollama. Please start it manually:
        echo     ollama serve
        echo.
        pause
        exit /b 1
    )
    echo   Ollama started.
) else (
    echo   Ollama is already running.
)
echo.

REM ------------------------------------------------------------------
REM Step 2: Check if Phi-3 model is available
REM ------------------------------------------------------------------
echo [2/3] Checking AI model...

ollama list 2>nul | findstr /i "phi3" >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo   The Phi-3 model is not downloaded yet.
    echo   Please run the setup script first:
    echo     scripts\setup.bat
    echo.
    pause
    exit /b 1
)
echo   Phi-3 model is ready.
echo.

REM ------------------------------------------------------------------
REM Step 3: Start Node.js server
REM ------------------------------------------------------------------
echo [3/3] Starting LearnQuest server...

cd /d "%~dp0.."

REM Check that dependencies are installed
if not exist "node_modules" (
    echo   Dependencies not found. Running npm install...
    call npm install
)

REM Open the browser after a short delay
start /B cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:5000"

REM Start the server (this blocks until Ctrl+C)
echo.
echo ============================================
echo   LearnQuest is running!
echo ============================================
echo.
echo   Open in your browser:  http://localhost:5000
echo.
echo   To stop: Press Ctrl+C or close this window.
echo.
echo ============================================
echo.

node server.js
