#!/bin/bash
# LearnQuest Quick Start (Mac/Linux)
# Usage: ./start.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$SCRIPT_DIR/learnquest-app"
PID_FILE="$SCRIPT_DIR/.learnquest.pid"

echo ""
echo "  LearnQuest -- Offline K-8 Tutoring"
echo "  ======================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "  [ERROR] Node.js is required. Install from https://nodejs.org/"
    exit 1
fi
echo "  [OK] Node.js $(node --version)"

# Check Ollama
if ! command -v ollama &> /dev/null; then
    echo "  [ERROR] Ollama is required. Install from https://ollama.com/"
    echo "          Or run: curl -fsSL https://ollama.com/install.sh | sh"
    exit 1
fi
echo "  [OK] Ollama installed"

# Check that the app directory exists
if [ ! -d "$APP_DIR" ]; then
    echo "  [ERROR] App directory not found: $APP_DIR"
    echo "          Make sure this script is in the LearnQuest-node root directory."
    exit 1
fi

# Check that server.js exists
if [ ! -f "$APP_DIR/server.js" ]; then
    echo "  [ERROR] server.js not found in $APP_DIR"
    exit 1
fi

# Check that node_modules exist
if [ ! -d "$APP_DIR/node_modules" ]; then
    echo "  [SETUP] Installing dependencies..."
    (cd "$APP_DIR" && npm install --production)
    if [ $? -ne 0 ]; then
        echo "  [ERROR] Failed to install dependencies."
        exit 1
    fi
    echo "  [OK] Dependencies installed"
fi

# Start Ollama if not running
if ! curl -s http://localhost:11434/ > /dev/null 2>&1; then
    echo "  Starting Ollama..."
    ollama serve > /dev/null 2>&1 &
    OLLAMA_PID=$!
    echo "ollama:$OLLAMA_PID" > "$PID_FILE"

    # Wait for Ollama to become responsive
    OLLAMA_READY=0
    for i in {1..15}; do
        if curl -s http://localhost:11434/ > /dev/null 2>&1; then
            OLLAMA_READY=1
            break
        fi
        sleep 1
    done

    if [ "$OLLAMA_READY" -eq 0 ]; then
        echo "  [WARN] Ollama may not have started correctly. Continuing anyway..."
    else
        echo "  [OK] Ollama running"
    fi
else
    echo "  [OK] Ollama already running"
    # Create a fresh PID file (no Ollama PID since we did not start it)
    > "$PID_FILE"
fi

# Check for phi3 model
if ! ollama list 2>/dev/null | grep -q "phi3"; then
    echo "  Downloading AI model (2.3 GB)... This is a one-time download."
    ollama pull phi3
    if [ $? -ne 0 ]; then
        echo "  [WARN] Failed to pull phi3 model. AI tutoring may not work."
    fi
fi
echo "  [OK] AI model ready"

# Start Node.js server
echo ""
echo "  Starting LearnQuest server..."
cd "$APP_DIR"
node server.js &
NODE_PID=$!
echo "node:$NODE_PID" >> "$PID_FILE"

# Wait for the server to become responsive
SERVER_READY=0
for i in {1..10}; do
    if curl -s http://localhost:5000/ > /dev/null 2>&1; then
        SERVER_READY=1
        break
    fi
    sleep 1
done

if [ "$SERVER_READY" -eq 0 ]; then
    echo "  [WARN] Server may still be starting. Check http://localhost:5000 in a moment."
else
    echo ""
    echo "  [OK] LearnQuest is running!"
fi

echo "  Open http://localhost:5000 in your browser"
echo "  Other devices on the same WiFi can connect too"
echo ""
echo "  Press Ctrl+C to stop"
echo ""

# Open browser
if command -v open &> /dev/null; then
    open http://localhost:5000
elif command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:5000
fi

# Handle Ctrl+C and other termination signals
cleanup() {
    echo ""
    echo "  Stopping LearnQuest..."
    if [ -f "$PID_FILE" ]; then
        while IFS=: read -r name pid; do
            if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
                kill "$pid" 2>/dev/null
                echo "  Stopped $name (PID: $pid)"
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi
    echo "  LearnQuest stopped. Safe to remove USB."
}
trap cleanup EXIT INT TERM

# Keep the script alive waiting for the Node process
wait $NODE_PID 2>/dev/null
