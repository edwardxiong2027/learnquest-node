#!/bin/bash
# ===========================================================================
# LearnQuest Setup Script (Mac / Linux)
# ===========================================================================
# This script checks prerequisites, installs Ollama if needed, downloads
# the Phi-3 AI model, and installs Node.js dependencies.
#
# Usage:
#   chmod +x scripts/setup.sh
#   ./scripts/setup.sh
# ===========================================================================

set -e

# Resolve the project root (parent of scripts/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo ""
echo "============================================"
echo "  LearnQuest Setup"
echo "  Offline K-8 Tutoring Platform"
echo "============================================"
echo ""

# ------------------------------------------------------------------
# Step 1: Check Node.js
# ------------------------------------------------------------------
echo "[1/5] Checking Node.js..."

if ! command -v node &> /dev/null; then
    echo ""
    echo "  Node.js is not installed."
    echo "  Please install Node.js v18 or later from: https://nodejs.org/"
    echo ""
    echo "  On Mac with Homebrew:  brew install node"
    echo "  On Ubuntu/Debian:      sudo apt install nodejs npm"
    echo "  On Fedora/RHEL:        sudo dnf install nodejs npm"
    echo ""
    exit 1
fi

NODE_VERSION=$(node --version)
echo "  Found Node.js $NODE_VERSION"

# Verify version is 18+
NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo ""
    echo "  Node.js v18 or later is required (found $NODE_VERSION)."
    echo "  Please update Node.js from: https://nodejs.org/"
    echo ""
    exit 1
fi
echo "  OK"
echo ""

# ------------------------------------------------------------------
# Step 2: Check / Install Ollama
# ------------------------------------------------------------------
echo "[2/5] Checking Ollama..."

if ! command -v ollama &> /dev/null; then
    echo "  Ollama is not installed. Installing now..."
    echo ""

    OS="$(uname -s)"
    case "$OS" in
        Darwin)
            echo "  Detected macOS."
            echo "  Downloading Ollama installer..."
            curl -fsSL https://ollama.com/install.sh | sh
            ;;
        Linux)
            echo "  Detected Linux."
            echo "  Downloading Ollama installer..."
            curl -fsSL https://ollama.com/install.sh | sh
            ;;
        *)
            echo "  Unsupported OS: $OS"
            echo "  Please install Ollama manually from: https://ollama.com/"
            exit 1
            ;;
    esac

    if ! command -v ollama &> /dev/null; then
        echo ""
        echo "  Failed to install Ollama automatically."
        echo "  Please install Ollama manually from: https://ollama.com/"
        exit 1
    fi
    echo ""
    echo "  Ollama installed successfully."
else
    OLLAMA_VERSION=$(ollama --version 2>/dev/null || echo "unknown")
    echo "  Found Ollama ($OLLAMA_VERSION)"
fi
echo "  OK"
echo ""

# ------------------------------------------------------------------
# Step 3: Start Ollama if not running
# ------------------------------------------------------------------
echo "[3/5] Starting Ollama..."

if curl -s http://localhost:11434/ > /dev/null 2>&1; then
    echo "  Ollama is already running."
else
    echo "  Starting Ollama serve in background..."
    ollama serve > /dev/null 2>&1 &
    OLLAMA_PID=$!

    # Wait for Ollama to become available (up to 15 seconds)
    ATTEMPTS=0
    while [ $ATTEMPTS -lt 15 ]; do
        if curl -s http://localhost:11434/ > /dev/null 2>&1; then
            break
        fi
        sleep 1
        ATTEMPTS=$((ATTEMPTS + 1))
    done

    if ! curl -s http://localhost:11434/ > /dev/null 2>&1; then
        echo ""
        echo "  Failed to start Ollama. Please start it manually:"
        echo "    ollama serve"
        echo ""
        exit 1
    fi
    echo "  Ollama is running (PID $OLLAMA_PID)."
fi
echo "  OK"
echo ""

# ------------------------------------------------------------------
# Step 4: Download Phi-3 model
# ------------------------------------------------------------------
echo "[4/5] Checking AI model (Phi-3)..."

if ollama list 2>/dev/null | grep -q "phi3"; then
    echo "  Phi-3 model is already downloaded."
else
    echo "  Downloading Phi-3 model (~2.3 GB)..."
    echo "  This is a one-time download. Please be patient."
    echo ""
    ollama pull phi3

    if [ $? -ne 0 ]; then
        echo ""
        echo "  Failed to download the Phi-3 model."
        echo "  Please ensure you have an internet connection and try again:"
        echo "    ollama pull phi3"
        echo ""
        exit 1
    fi
    echo ""
    echo "  Phi-3 model downloaded successfully."
fi
echo "  OK"
echo ""

# ------------------------------------------------------------------
# Step 5: Install Node.js dependencies
# ------------------------------------------------------------------
echo "[5/5] Installing Node.js dependencies..."

cd "$PROJECT_DIR"
npm install

if [ $? -ne 0 ]; then
    echo ""
    echo "  Failed to install dependencies."
    echo "  Please try running 'npm install' manually in the project directory."
    exit 1
fi
echo "  OK"
echo ""

# ------------------------------------------------------------------
# Done
# ------------------------------------------------------------------
echo "============================================"
echo "  Setup complete!"
echo "============================================"
echo ""
echo "  To start LearnQuest:"
echo ""
echo "    npm start"
echo ""
echo "  Or use the start script:"
echo ""
echo "    ./scripts/start.sh"
echo ""
echo "  Then open http://localhost:5000 in your browser."
echo ""
echo "  Default teacher login:"
echo "    Name: teacher"
echo "    PIN:  1234"
echo ""
echo "============================================"
