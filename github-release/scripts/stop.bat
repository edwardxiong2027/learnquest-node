@echo off
REM ===========================================================================
REM LearnQuest Stop Script (Windows)
REM ===========================================================================
REM Stops the LearnQuest Node.js server and optionally the Ollama process.
REM
REM Usage:
REM   scripts\stop.bat
REM ===========================================================================

echo.
echo ============================================
echo   Stopping LearnQuest...
echo ============================================
echo.

REM ------------------------------------------------------------------
REM Stop the Node.js server
REM ------------------------------------------------------------------
echo Stopping Node.js server...

tasklist /FI "IMAGENAME eq node.exe" 2>nul | findstr /i "node.exe" >nul 2>&1
if %errorlevel% equ 0 (
    taskkill /F /IM node.exe >nul 2>&1
    echo   Node.js server stopped.
) else (
    echo   No running Node.js server found.
)
echo.

REM ------------------------------------------------------------------
REM Stop Ollama
REM ------------------------------------------------------------------
echo Stopping Ollama...

tasklist /FI "IMAGENAME eq ollama.exe" 2>nul | findstr /i "ollama.exe" >nul 2>&1
if %errorlevel% equ 0 (
    taskkill /F /IM ollama.exe >nul 2>&1
    echo   Ollama stopped.
) else (
    echo   Ollama is not running.
)
echo.

REM ------------------------------------------------------------------
REM Also stop ollama_llama_server if present
REM ------------------------------------------------------------------
tasklist /FI "IMAGENAME eq ollama_llama_server.exe" 2>nul | findstr /i "ollama_llama_server.exe" >nul 2>&1
if %errorlevel% equ 0 (
    taskkill /F /IM ollama_llama_server.exe >nul 2>&1
    echo   Ollama model server stopped.
)

echo.
echo ============================================
echo   LearnQuest stopped.
echo ============================================
echo.
pause
