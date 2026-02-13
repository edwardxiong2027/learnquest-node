#!/bin/bash
# ============================================================================
# LearnQuest Mac App Launcher
# ============================================================================
# This script runs when the user double-clicks LearnQuest.app. It:
#   1. Checks for / installs Ollama
#   2. Starts Ollama serve (with models stored in the app bundle)
#   3. Checks for / pulls the Phi-3 model
#   4. Starts the Node.js server using the bundled binary
#   5. Opens the browser
#   6. Cleans up all child processes on exit
# ============================================================================

# Resolve paths relative to the .app bundle
MACOS_DIR="$(cd "$(dirname "$0")" && pwd)"
CONTENTS_DIR="$(cd "$MACOS_DIR/.." && pwd)"
RESOURCES_DIR="$CONTENTS_DIR/Resources"

NODE_BIN="$RESOURCES_DIR/node"
APP_DIR="$RESOURCES_DIR/app"
APP_ENTRY="$APP_DIR/server.js"
OLLAMA_MODELS_DIR="$RESOURCES_DIR/ollama_models"
LOG_FILE="$RESOURCES_DIR/learnquest.log"
PID_FILE="$RESOURCES_DIR/.learnquest.pid"

# Server configuration
SERVER_PORT=5000
SERVER_URL="http://localhost:${SERVER_PORT}"
OLLAMA_URL="http://localhost:11434"

# Export environment variables
export OLLAMA_MODELS="$OLLAMA_MODELS_DIR"
export NODE_ENV="production"

# ============================================================================
# Utility functions
# ============================================================================

# Show a macOS dialog box with an OK button. Blocks until dismissed.
show_dialog() {
    local message="$1"
    local title="${2:-LearnQuest}"
    osascript -e "display dialog \"${message}\" with title \"${title}\" buttons {\"OK\"} default button \"OK\"" 2>/dev/null
}

# Show a macOS dialog with Yes/No buttons. Returns 0 if Yes, 1 if No.
show_dialog_yesno() {
    local message="$1"
    local title="${2:-LearnQuest}"
    local result
    result=$(osascript -e "display dialog \"${message}\" with title \"${title}\" buttons {\"Yes\", \"No\"} default button \"Yes\"" 2>/dev/null)
    if echo "$result" | grep -q "Yes"; then
        return 0
    else
        return 1
    fi
}

# Show a macOS notification banner (non-blocking).
show_notification() {
    local message="$1"
    local subtitle="${2:-}"
    osascript -e "display notification \"${message}\" with title \"LearnQuest\" subtitle \"${subtitle}\"" 2>/dev/null
}

# Show an error dialog and exit.
show_error_and_exit() {
    local message="$1"
    osascript -e "display dialog \"${message}\" with title \"LearnQuest - Error\" buttons {\"OK\"} default button \"OK\" with icon stop" 2>/dev/null
    cleanup
    exit 1
}

# Write a timestamped log message
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Check if a given port is in use
port_in_use() {
    lsof -i ":$1" >/dev/null 2>&1
}

# Wait for a URL to respond, with a maximum number of retries
wait_for_url() {
    local url="$1"
    local max_attempts="${2:-20}"
    local attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    return 1
}

# ============================================================================
# Process management
# ============================================================================

OLLAMA_PID=""
NODE_PID=""
STARTED_OLLAMA=false

# Write PIDs to the PID file for tracking
write_pid() {
    local name="$1"
    local pid="$2"
    echo "${name}:${pid}" >> "$PID_FILE"
}

# Clean up all child processes on exit
cleanup() {
    log "Shutting down LearnQuest..."

    # Kill the Node.js server
    if [ -n "$NODE_PID" ] && kill -0 "$NODE_PID" 2>/dev/null; then
        log "Stopping Node.js server (PID $NODE_PID)..."
        kill "$NODE_PID" 2>/dev/null
        # Give it a moment to shut down gracefully
        sleep 1
        kill -9 "$NODE_PID" 2>/dev/null
    fi

    # Kill Ollama only if we started it
    if [ "$STARTED_OLLAMA" = true ] && [ -n "$OLLAMA_PID" ] && kill -0 "$OLLAMA_PID" 2>/dev/null; then
        log "Stopping Ollama (PID $OLLAMA_PID)..."
        kill "$OLLAMA_PID" 2>/dev/null
        sleep 1
        kill -9 "$OLLAMA_PID" 2>/dev/null
    fi

    # Remove the PID file
    rm -f "$PID_FILE"

    log "LearnQuest stopped."
}

trap cleanup EXIT INT TERM

# ============================================================================
# Check for stale instance
# ============================================================================

if [ -f "$PID_FILE" ]; then
    STALE_RUNNING=false
    while IFS=: read -r name pid; do
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            STALE_RUNNING=true
        fi
    done < "$PID_FILE"

    if [ "$STALE_RUNNING" = true ]; then
        if show_dialog_yesno "LearnQuest appears to be already running.\n\nDo you want to stop the existing instance and start a new one?"; then
            # Kill stale processes
            while IFS=: read -r name pid; do
                if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
                    kill "$pid" 2>/dev/null
                    sleep 1
                    kill -9 "$pid" 2>/dev/null
                fi
            done < "$PID_FILE"
            rm -f "$PID_FILE"
            sleep 2
        else
            # Just open the browser to the existing instance
            open "$SERVER_URL"
            exit 0
        fi
    else
        # Stale PID file, clean it up
        rm -f "$PID_FILE"
    fi
fi

# ============================================================================
# Initialize log
# ============================================================================
echo "" >> "$LOG_FILE"
log "============================================"
log "LearnQuest starting up"
log "Architecture: $(uname -m)"
log "macOS: $(sw_vers -productVersion 2>/dev/null || echo 'unknown')"
log "============================================"

# ============================================================================
# STEP 1: Check / install Ollama
# ============================================================================
log "Checking for Ollama..."

OLLAMA_BIN=""

# Check common Ollama install locations
if command -v ollama &>/dev/null; then
    OLLAMA_BIN="$(command -v ollama)"
elif [ -f "/usr/local/bin/ollama" ]; then
    OLLAMA_BIN="/usr/local/bin/ollama"
elif [ -f "/opt/homebrew/bin/ollama" ]; then
    OLLAMA_BIN="/opt/homebrew/bin/ollama"
elif [ -d "/Applications/Ollama.app" ]; then
    # Ollama installed as a Mac app but CLI might not be in PATH
    OLLAMA_BIN="/Applications/Ollama.app/Contents/Resources/ollama"
fi

if [ -z "$OLLAMA_BIN" ] || [ ! -x "$OLLAMA_BIN" ]; then
    log "Ollama not found. Prompting user to install."

    if show_dialog_yesno "LearnQuest needs Ollama (the AI engine) to provide tutoring.\n\nThis is a one-time setup that requires an internet connection.\n\nWould you like to install Ollama now?"; then
        show_notification "Installing Ollama..." "This may take a minute"
        log "User accepted Ollama install. Downloading..."

        # Download Ollama installer
        INSTALL_RESULT=0
        curl -fsSL https://ollama.com/install.sh | sh >> "$LOG_FILE" 2>&1 || INSTALL_RESULT=$?

        if [ $INSTALL_RESULT -ne 0 ]; then
            log "Ollama install script failed. Trying direct download..."

            # Fallback: try downloading the macOS app directly
            OLLAMA_DMG="/tmp/Ollama.dmg"
            curl -fsSL -o "$OLLAMA_DMG" "https://ollama.com/download/Ollama-darwin.zip" >> "$LOG_FILE" 2>&1

            if [ -f "$OLLAMA_DMG" ]; then
                # Unzip and move to Applications
                OLLAMA_TMP="/tmp/ollama-install"
                rm -rf "$OLLAMA_TMP"
                mkdir -p "$OLLAMA_TMP"
                unzip -q "$OLLAMA_DMG" -d "$OLLAMA_TMP" >> "$LOG_FILE" 2>&1

                if [ -d "$OLLAMA_TMP/Ollama.app" ]; then
                    cp -R "$OLLAMA_TMP/Ollama.app" "/Applications/" >> "$LOG_FILE" 2>&1
                    OLLAMA_BIN="/Applications/Ollama.app/Contents/Resources/ollama"
                fi
                rm -rf "$OLLAMA_TMP" "$OLLAMA_DMG"
            fi
        fi

        # Re-check for ollama
        if command -v ollama &>/dev/null; then
            OLLAMA_BIN="$(command -v ollama)"
        elif [ -f "/usr/local/bin/ollama" ]; then
            OLLAMA_BIN="/usr/local/bin/ollama"
        fi

        if [ -z "$OLLAMA_BIN" ] || [ ! -x "$OLLAMA_BIN" ]; then
            show_error_and_exit "Failed to install Ollama.\n\nPlease install it manually from https://ollama.com and then re-launch LearnQuest."
        fi

        log "Ollama installed at: $OLLAMA_BIN"
        show_notification "Ollama installed!" "Setting up AI model..."
    else
        show_error_and_exit "LearnQuest requires Ollama to function.\n\nPlease install Ollama from https://ollama.com and try again."
    fi
else
    log "Ollama found at: $OLLAMA_BIN"
fi

# ============================================================================
# STEP 2: Start Ollama serve (if not already running)
# ============================================================================
log "Checking if Ollama is running..."

if curl -sf "$OLLAMA_URL" > /dev/null 2>&1; then
    log "Ollama is already running."
    STARTED_OLLAMA=false
else
    log "Starting Ollama serve..."

    # Ensure the models directory exists
    mkdir -p "$OLLAMA_MODELS_DIR"

    # Start Ollama with our custom model directory
    OLLAMA_MODELS="$OLLAMA_MODELS_DIR" "$OLLAMA_BIN" serve >> "$LOG_FILE" 2>&1 &
    OLLAMA_PID=$!
    STARTED_OLLAMA=true
    write_pid "ollama" "$OLLAMA_PID"

    log "Ollama serve started (PID $OLLAMA_PID). Waiting for it to be ready..."

    if ! wait_for_url "$OLLAMA_URL" 20; then
        log "Ollama failed to start within 20 seconds."

        # Try launching the Ollama macOS app instead
        if [ -d "/Applications/Ollama.app" ]; then
            log "Attempting to launch Ollama.app..."
            open -a "Ollama" 2>/dev/null
            sleep 5

            if ! curl -sf "$OLLAMA_URL" > /dev/null 2>&1; then
                show_error_and_exit "Ollama failed to start.\n\nPlease try launching Ollama manually from your Applications folder, then re-launch LearnQuest."
            fi
        else
            show_error_and_exit "Ollama failed to start.\n\nPlease check the log file at:\n${LOG_FILE}\n\nand try again."
        fi
    fi

    log "Ollama is now running."
fi

# ============================================================================
# STEP 3: Check / pull the Phi-3 model
# ============================================================================
log "Checking for Phi-3 model..."

MODEL_PRESENT=false
MODEL_LIST=$(OLLAMA_MODELS="$OLLAMA_MODELS_DIR" "$OLLAMA_BIN" list 2>/dev/null || curl -sf "$OLLAMA_URL/api/tags" 2>/dev/null || echo "")

if echo "$MODEL_LIST" | grep -qi "phi3"; then
    MODEL_PRESENT=true
    log "Phi-3 model is available."
fi

if [ "$MODEL_PRESENT" = false ]; then
    log "Phi-3 model not found. Prompting user to download."

    show_dialog "LearnQuest needs to download the AI tutoring model (Phi-3, about 2.3 GB).\n\nThis is a one-time download that requires an internet connection.\n\nClick OK to start the download."

    show_notification "Downloading AI model..." "This may take several minutes"

    log "Pulling phi3 model..."
    PULL_RESULT=0
    OLLAMA_MODELS="$OLLAMA_MODELS_DIR" "$OLLAMA_BIN" pull phi3 >> "$LOG_FILE" 2>&1 || PULL_RESULT=$?

    if [ $PULL_RESULT -ne 0 ]; then
        log "Failed to pull phi3 model (exit code $PULL_RESULT)."
        show_error_and_exit "Failed to download the AI model.\n\nPlease check your internet connection and try again.\n\nIf the problem persists, try running in Terminal:\n  ollama pull phi3"
    fi

    log "Phi-3 model downloaded successfully."
    show_notification "AI model ready!" "Starting LearnQuest..."
fi

# ============================================================================
# STEP 4: Check port availability
# ============================================================================
if port_in_use $SERVER_PORT; then
    log "Port $SERVER_PORT is already in use."

    # Check if it is our own server
    if curl -sf "$SERVER_URL" > /dev/null 2>&1; then
        # Something is already serving on this port -- might be a previous instance
        if show_dialog_yesno "Port $SERVER_PORT is already in use.\n\nAnother instance of LearnQuest or another application may be running on this port.\n\nWould you like to open the browser to the existing server?"; then
            open "$SERVER_URL"
            # Don't clean up since we didn't start anything
            STARTED_OLLAMA=false
            OLLAMA_PID=""
            exit 0
        else
            show_error_and_exit "Cannot start LearnQuest because port $SERVER_PORT is in use.\n\nPlease close the application using that port and try again."
        fi
    fi
fi

# ============================================================================
# STEP 5: Start the Node.js server
# ============================================================================
log "Starting Node.js server..."

if [ ! -x "$NODE_BIN" ]; then
    log "Node binary not found or not executable at: $NODE_BIN"
    show_error_and_exit "The bundled Node.js binary is missing or not executable.\n\nPath: $NODE_BIN\n\nThe .app bundle may be corrupted. Please re-download LearnQuest."
fi

if [ ! -f "$APP_ENTRY" ]; then
    log "server.js not found at: $APP_ENTRY"
    show_error_and_exit "Application files are missing.\n\nExpected: $APP_ENTRY\n\nThe .app bundle may be corrupted. Please re-download LearnQuest."
fi

# Set environment variables for the server
export PORT="$SERVER_PORT"
export LEARNQUEST_DB="$APP_DIR/database/learnquest.db"

# Start the server
"$NODE_BIN" "$APP_ENTRY" >> "$LOG_FILE" 2>&1 &
NODE_PID=$!
write_pid "node" "$NODE_PID"

log "Node.js server started (PID $NODE_PID). Waiting for it to be ready..."

# Wait for server to be ready (max 15 seconds)
if ! wait_for_url "$SERVER_URL" 15; then
    log "Node.js server failed to start within 15 seconds."

    # Check if the process is still alive
    if ! kill -0 "$NODE_PID" 2>/dev/null; then
        log "Node.js process has exited. Check the log for errors."
        # Show the last few lines of the log for debugging
        TAIL_LOG=$(tail -20 "$LOG_FILE" 2>/dev/null || echo "No log available")
        show_error_and_exit "LearnQuest server failed to start.\n\nCheck the log file at:\n${LOG_FILE}"
    else
        show_error_and_exit "LearnQuest server is taking too long to start.\n\nCheck the log file at:\n${LOG_FILE}"
    fi
fi

log "LearnQuest server is ready at $SERVER_URL"

# ============================================================================
# STEP 6: Open the browser
# ============================================================================
open "$SERVER_URL"
log "Browser opened to $SERVER_URL"

# ============================================================================
# STEP 7: Show running notification
# ============================================================================
show_dialog "LearnQuest is running!\n\nOpen your browser to:\n${SERVER_URL}\n\nOther devices on the same network can connect using your computer's IP address on port ${SERVER_PORT}.\n\nClick OK when you are done to stop the server." "LearnQuest"

# When the user dismisses the dialog, cleanup runs via the EXIT trap
log "User dismissed the running dialog. Shutting down."
