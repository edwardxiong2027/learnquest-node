#!/bin/bash
# =============================================================================
# LearnQuest Windows Installer Build Script
# =============================================================================
#
# This script prepares LearnQuest for Windows distribution. It can be run on
# macOS for cross-compilation of the Node.js application.
#
# CROSS-COMPILATION PROCESS:
# --------------------------
# 1. This script runs on Mac/Linux to assemble all application files
# 2. It uses `pkg` (npm package) to compile server.js into a standalone .exe
#    that bundles Node.js runtime - no separate Node.js install needed
# 3. The assembled build directory is then taken to a Windows machine
# 4. On Windows, Inno Setup compiles the final .exe installer using
#    installer-assets/learnquest-setup.iss
#
# PREREQUISITES:
#   - Node.js and npm installed on this machine
#   - npm install -g @yao-pkg/pkg  (or npm install -g pkg)
#   - Inno Setup 6+ on a Windows machine (for final installer creation)
#
# USAGE:
#   chmod +x build-windows.sh
#   ./build-windows.sh
#
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
APP_SRC="$ROOT_DIR/learnquest-app"
BUILD_DIR="$SCRIPT_DIR/build"
ASSETS_DIR="$SCRIPT_DIR/installer-assets"

echo "============================================"
echo "  LearnQuest Windows Build"
echo "============================================"
echo ""
echo "Source:  $APP_SRC"
echo "Output:  $BUILD_DIR/learnquest"
echo ""

# ---------------------------------------------------------------------------
# Step 1: Validate prerequisites
# ---------------------------------------------------------------------------
echo "[1/6] Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed. Please install npm first."
    exit 1
fi

NODE_VERSION=$(node -v)
echo "  Node.js version: $NODE_VERSION"

# Check for pkg
PKG_CMD=""
if command -v pkg &> /dev/null; then
    PKG_CMD="pkg"
elif npx pkg --help &> /dev/null 2>&1; then
    PKG_CMD="npx pkg"
else
    echo "WARNING: pkg is not installed. Install it with:"
    echo "  npm install -g @yao-pkg/pkg"
    echo ""
    echo "Continuing without pkg - will create a non-bundled build."
    echo "Node.js will need to be installed on the target Windows machine."
fi

# ---------------------------------------------------------------------------
# Step 2: Clean and prepare build directory
# ---------------------------------------------------------------------------
echo "[2/6] Preparing build directory..."

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/learnquest"

# ---------------------------------------------------------------------------
# Step 3: Copy application files
# ---------------------------------------------------------------------------
echo "[3/6] Copying application files..."

# Core application files
cp "$APP_SRC/server.js" "$BUILD_DIR/learnquest/"
cp "$APP_SRC/package.json" "$BUILD_DIR/learnquest/"

# Application source code
if [ -d "$APP_SRC/src" ]; then
    cp -R "$APP_SRC/src" "$BUILD_DIR/learnquest/"
    echo "  Copied src/"
fi

# Frontend assets
if [ -d "$APP_SRC/public" ]; then
    cp -R "$APP_SRC/public" "$BUILD_DIR/learnquest/"
    echo "  Copied public/"
fi

# HTML templates
if [ -d "$APP_SRC/templates" ]; then
    cp -R "$APP_SRC/templates" "$BUILD_DIR/learnquest/"
    echo "  Copied templates/"
fi

# Curriculum content
if [ -d "$APP_SRC/content" ]; then
    cp -R "$APP_SRC/content" "$BUILD_DIR/learnquest/"
    echo "  Copied content/"
fi

# LLM system prompts
if [ -d "$APP_SRC/prompts" ]; then
    cp -R "$APP_SRC/prompts" "$BUILD_DIR/learnquest/"
    echo "  Copied prompts/"
fi

# Database schema (not the .db file itself - it gets created on first run)
if [ -d "$APP_SRC/database" ]; then
    mkdir -p "$BUILD_DIR/learnquest/database"
    cp "$APP_SRC/database/schema.sql" "$BUILD_DIR/learnquest/database/" 2>/dev/null || true
    echo "  Copied database/schema.sql"
fi

# Node modules
if [ -d "$APP_SRC/node_modules" ]; then
    cp -R "$APP_SRC/node_modules" "$BUILD_DIR/learnquest/"
    echo "  Copied node_modules/"
else
    echo "  WARNING: node_modules not found. Running npm install..."
    cd "$BUILD_DIR/learnquest"
    npm install --production
    cd "$SCRIPT_DIR"
fi

# ---------------------------------------------------------------------------
# Step 4: Create Windows launcher batch file
# ---------------------------------------------------------------------------
echo "[4/6] Creating Windows launcher..."

cat > "$BUILD_DIR/learnquest/LearnQuest.bat" << 'BATCH'
@echo off
title LearnQuest - Offline K-8 Tutoring
echo.
echo  =============================================
echo   LearnQuest - Offline K-8 Tutoring Platform
echo  =============================================
echo.
echo  Starting LearnQuest...
echo.

REM Determine our install directory
set "APP_DIR=%~dp0"

REM Check if Ollama is installed
where ollama >nul 2>&1
if %errorlevel% neq 0 (
    echo  [!] Ollama is not installed.
    echo.
    echo  Ollama is required for the AI tutoring features.
    echo  Please download and install Ollama from https://ollama.com/download
    echo  After installing Ollama, run this script again.
    echo.
    choice /c YN /m "Open the Ollama download page now?"
    if %errorlevel% equ 1 start https://ollama.com/download
    pause
    exit /b 1
)

echo  [OK] Ollama is installed.

REM Start Ollama if not already running
curl -s http://localhost:11434/ >nul 2>&1
if %errorlevel% neq 0 (
    echo  Starting Ollama service...
    start /b "" ollama serve >nul 2>&1
    echo  Waiting for Ollama to initialize...
    timeout /t 5 /nobreak >nul
)

REM Verify Ollama is responding
curl -s http://localhost:11434/ >nul 2>&1
if %errorlevel% neq 0 (
    echo  [!] Could not start Ollama. Please start it manually and try again.
    pause
    exit /b 1
)
echo  [OK] Ollama is running.

REM Check for phi3 model
ollama list 2>nul | findstr /i "phi3" >nul
if %errorlevel% neq 0 (
    echo.
    echo  Downloading AI model (phi3, ~2.3 GB)...
    echo  This is a one-time download. Please be patient.
    echo.
    ollama pull phi3
    if %errorlevel% neq 0 (
        echo  [!] Failed to download the AI model.
        echo  Please check your internet connection and try again.
        pause
        exit /b 1
    )
)
echo  [OK] AI model is ready.

REM Check if node.exe exists (bundled) or if Node.js is installed
if exist "%APP_DIR%node.exe" (
    set "NODE_CMD=%APP_DIR%node.exe"
) else (
    where node >nul 2>&1
    if %errorlevel% neq 0 (
        echo  [!] Node.js is not installed and no bundled runtime was found.
        echo  Please install Node.js from https://nodejs.org/
        pause
        exit /b 1
    )
    set "NODE_CMD=node"
)

REM Start the LearnQuest server
echo.
echo  Starting LearnQuest server...
echo  Opening http://localhost:5000 in your browser...
echo.
echo  Keep this window open while using LearnQuest.
echo  Press Ctrl+C to stop the server.
echo.
start http://localhost:5000
"%NODE_CMD%" "%APP_DIR%server.js"
BATCH

echo "  Created LearnQuest.bat"

# ---------------------------------------------------------------------------
# Step 5: Copy installer assets
# ---------------------------------------------------------------------------
echo "[5/6] Copying installer assets..."

if [ -f "$ASSETS_DIR/icon.ico" ]; then
    cp "$ASSETS_DIR/icon.ico" "$BUILD_DIR/learnquest/"
    echo "  Copied icon.ico"
else
    echo "  WARNING: icon.ico not found in installer-assets/."
    echo "  You will need to add an icon.ico file before building the installer."
fi

if [ -f "$ASSETS_DIR/license.txt" ]; then
    cp "$ASSETS_DIR/license.txt" "$BUILD_DIR/learnquest/"
    echo "  Copied license.txt"
fi

# ---------------------------------------------------------------------------
# Step 6: Optional - Build standalone executable with pkg
# ---------------------------------------------------------------------------
echo "[6/6] Building standalone executable..."

if [ -n "$PKG_CMD" ]; then
    echo "  Using $PKG_CMD to create Windows executable..."
    cd "$BUILD_DIR/learnquest"

    # pkg compiles server.js + node_modules into a single .exe
    # --targets node18-win-x64 creates a Windows x64 binary
    $PKG_CMD server.js \
        --targets node18-win-x64 \
        --output "$BUILD_DIR/learnquest/learnquest-server.exe" \
        --compress GZip \
        2>&1 || {
            echo "  WARNING: pkg build failed. Falling back to non-bundled build."
            echo "  Node.js will need to be installed on the target machine."
        }

    cd "$SCRIPT_DIR"

    if [ -f "$BUILD_DIR/learnquest/learnquest-server.exe" ]; then
        echo "  Standalone executable created successfully."
    fi
else
    echo "  Skipped (pkg not available). Node.js required on target machine."
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "============================================"
echo "  Build Complete"
echo "============================================"
echo ""
echo "Build output: $BUILD_DIR/learnquest/"
echo ""
echo "Contents:"
ls -la "$BUILD_DIR/learnquest/" 2>/dev/null || dir "$BUILD_DIR/learnquest/" 2>/dev/null
echo ""
echo "NEXT STEPS:"
echo ""
echo "  Option A - Simple distribution (requires Node.js on target):"
echo "    1. Zip the build/learnquest/ folder"
echo "    2. Distribute the zip file"
echo "    3. Users extract and run LearnQuest.bat"
echo ""
echo "  Option B - Professional installer (recommended):"
echo "    1. Copy build/learnquest/ to a Windows machine"
echo "    2. Install Inno Setup 6 (https://jrsoftware.org/isinfo.php)"
echo "    3. Open installer-assets/learnquest-setup.iss in Inno Setup"
echo "    4. Click Build > Compile"
echo "    5. The installer .exe will be created in build/"
echo ""
echo "  NOTE: If you used pkg to create a standalone .exe, update the"
echo "  .iss script to reference learnquest-server.exe instead of"
echo "  LearnQuest.bat as the main executable."
echo ""
