#!/bin/bash
# ===========================================================================
# LearnQuest Start Script (Mac / Linux)
# ===========================================================================
# Starts the Ollama AI engine and the LearnQuest Node.js server,
# then opens the browser.
#
# Usage:
#   chmod +x scripts/start.sh
#   ./scripts/start.sh
# ===========================================================================

# Resolve the project root (parent of scripts/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo ""
echo "============================================"
echo "  Starting LearnQuest..."
echo "============================================"
echo ""

# ------------------------------------------------------------------
# Step 1: Start Ollama if not running
# ------------------------------------------------------------------
echo "[1/3] Checking Ollama..."

# Optionally point Ollama models to a local directory (e.g., USB)
if [ -d "$PROJECT_DIR/ollama_models" ]; then
    export OLLAMA_MODELS="$PROJECT_DIR/ollama_models"
    echo "  Using local model storage: $OLLAMA_MODELS"
fi

if curl -s http://localhost:11434/ > /dev/null 2>&1; then
    echo "  Ollama is already running."
else
    if ! command -v ollama &> /dev/null; then
        echo ""
        echo "  Ollama is not installed. Please run the setup script first:"
        echo "    ./scripts/setup.sh"
        echo ""
        exit 1
    fi

    echo "  Starting Ollama serve..."
    ollama serve > /dev/null 2>&1 &
    OLLAMA_PID=$!

    # Wait for Ollama to start (up to 15 seconds)
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
    echo "  Ollama started (PID $OLLAMA_PID)."
fi
echo ""

# ------------------------------------------------------------------
# Step 2: Check if Phi-3 model is available
# ------------------------------------------------------------------
echo "[2/3] Checking AI model..."

if ! ollama list 2>/dev/null | grep -q "phi3"; then
    echo ""
    echo "  The Phi-3 model is not downloaded yet."
    echo "  Please run the setup script first:"
    echo "    ./scripts/setup.sh"
    echo ""
    echo "  Or download it manually:"
    echo "    ollama pull phi3"
    echo ""
    exit 1
fi
echo "  Phi-3 model is ready."
echo ""

# ------------------------------------------------------------------
# Step 3: Start Node.js server
# ------------------------------------------------------------------
echo "[3/3] Starting LearnQuest server..."

cd "$PROJECT_DIR"

# Check that dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "  Dependencies not found. Running npm install..."
    npm install
fi

# Start the server
node server.js &
SERVER_PID=$!

# Wait for server to start (up to 10 seconds)
ATTEMPTS=0
while [ $ATTEMPTS -lt 10 ]; do
    if curl -s http://localhost:5000/ > /dev/null 2>&1; then
        break
    fi
    sleep 1
    ATTEMPTS=$((ATTEMPTS + 1))
done

if ! curl -s http://localhost:5000/ > /dev/null 2>&1; then
    echo ""
    echo "  Server failed to start. Check the console output for errors."
    echo ""
    exit 1
fi

echo ""
echo "============================================"
echo "  LearnQuest is running!"
echo "============================================"
echo ""
echo "  Open in your browser:  http://localhost:5000"
echo ""
echo "  Other devices on the same network can connect at:"
LOCAL_IP=$(ifconfig 2>/dev/null | grep "inet " | grep -v "127.0.0.1" | head -1 | awk '{print $2}')
if [ -n "$LOCAL_IP" ]; then
    echo "    http://$LOCAL_IP:5000"
fi
echo ""
echo "  To stop LearnQuest:  ./scripts/stop.sh"
echo "  Or press Ctrl+C in this terminal."
echo ""
echo "============================================"

# Open browser
OS="$(uname -s)"
case "$OS" in
    Darwin)
        open "http://localhost:5000" 2>/dev/null
        ;;
    Linux)
        xdg-open "http://localhost:5000" 2>/dev/null || sensible-browser "http://localhost:5000" 2>/dev/null
        ;;
esac

# Wait for the server process so Ctrl+C works
wait $SERVER_PID
