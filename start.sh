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

# Detect which AI model to use
# Priority: phi3:medium (best quality) > llama3.2:3b > phi3 (mini)
AVAILABLE_MODELS=$(ollama list 2>/dev/null)
if echo "$AVAILABLE_MODELS" | grep -q "phi3:medium"; then
    export LEARNQUEST_MODEL="phi3:medium"
    echo "  [OK] AI model: phi3:medium (best for grades 9-12)"
elif echo "$AVAILABLE_MODELS" | grep -q "llama3.2:3b"; then
    export LEARNQUEST_MODEL="llama3.2:3b"
    echo "  [OK] AI model: llama3.2:3b (good for all grades)"
elif echo "$AVAILABLE_MODELS" | grep -q "phi3"; then
    export LEARNQUEST_MODEL="phi3"
    echo "  [OK] AI model: phi3 (mini, good for grades K-8)"
else
    echo "  [WARN] No AI model found. Trying to pull llama3.2:3b..."
    ollama pull llama3.2:3b
    if [ $? -eq 0 ]; then
        export LEARNQUEST_MODEL="llama3.2:3b"
        echo "  [OK] AI model: llama3.2:3b"
    else
        echo "  [WARN] No AI model available. AI tutoring will not work."
        echo "         Run the install script from the USB drive first."
        export LEARNQUEST_MODEL="phi3"
    fi
fi

# Start Node.js server
echo ""
echo "  Starting LearnQuest server..."
echo "  Using model: $LEARNQUEST_MODEL"
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
