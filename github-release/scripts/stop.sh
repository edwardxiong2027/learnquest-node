#!/bin/bash
# ===========================================================================
# LearnQuest Stop Script (Mac / Linux)
# ===========================================================================
# Stops the LearnQuest Node.js server and optionally the Ollama process
# that was started by the start script.
#
# Usage:
#   chmod +x scripts/stop.sh
#   ./scripts/stop.sh
# ===========================================================================

echo ""
echo "============================================"
echo "  Stopping LearnQuest..."
echo "============================================"
echo ""

STOPPED_SOMETHING=false

# ------------------------------------------------------------------
# Stop the Node.js server
# ------------------------------------------------------------------
echo "Stopping Node.js server..."

# Find and kill any node process running server.js
NODE_PIDS=$(pgrep -f "node.*server\.js" 2>/dev/null)
if [ -n "$NODE_PIDS" ]; then
    for PID in $NODE_PIDS; do
        echo "  Killing node process (PID $PID)..."
        kill "$PID" 2>/dev/null
    done
    STOPPED_SOMETHING=true
    echo "  Node.js server stopped."
else
    echo "  No running LearnQuest server found."
fi
echo ""

# ------------------------------------------------------------------
# Stop Ollama (only if it was started by our start script)
# ------------------------------------------------------------------
echo "Stopping Ollama..."

# Check if Ollama is running on port 11434
if curl -s http://localhost:11434/ > /dev/null 2>&1; then
    OLLAMA_PIDS=$(pgrep -f "ollama serve" 2>/dev/null)
    if [ -n "$OLLAMA_PIDS" ]; then
        for PID in $OLLAMA_PIDS; do
            echo "  Killing Ollama process (PID $PID)..."
            kill "$PID" 2>/dev/null
        done
        STOPPED_SOMETHING=true
        echo "  Ollama stopped."
    else
        echo "  Ollama is running but was not started by LearnQuest (skipping)."
    fi
else
    echo "  Ollama is not running."
fi
echo ""

# ------------------------------------------------------------------
# Summary
# ------------------------------------------------------------------
if [ "$STOPPED_SOMETHING" = true ]; then
    echo "============================================"
    echo "  LearnQuest stopped."
    echo "============================================"
else
    echo "============================================"
    echo "  Nothing to stop -- LearnQuest was not running."
    echo "============================================"
fi
echo ""
