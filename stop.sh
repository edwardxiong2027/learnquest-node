#!/bin/bash
# LearnQuest Stop Script
# Usage: ./stop.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/.learnquest.pid"

echo ""
echo "  Stopping LearnQuest..."

STOPPED_SOMETHING=0

if [ -f "$PID_FILE" ]; then
    while IFS=: read -r name pid; do
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
            echo "  Stopped $name (PID: $pid)"
            STOPPED_SOMETHING=1
        fi
    done < "$PID_FILE"
    rm -f "$PID_FILE"
else
    # No PID file found -- try to find and kill by port as a fallback
    PID=$(lsof -ti:5000 2>/dev/null)
    if [ -n "$PID" ]; then
        kill $PID 2>/dev/null
        echo "  Stopped server on port 5000 (PID: $PID)"
        STOPPED_SOMETHING=1
    fi
fi

if [ "$STOPPED_SOMETHING" -eq 1 ]; then
    echo "  LearnQuest stopped. Safe to remove USB."
else
    echo "  LearnQuest does not appear to be running."
fi

echo ""
