#!/bin/bash
# =============================================================================
# Ollama Installer for macOS
# =============================================================================
#
# Downloads and installs Ollama on macOS. This script is used by LearnQuest
# to ensure Ollama is available for AI tutoring features.
#
# USAGE:
#   chmod +x ollama-installer-mac.sh
#   ./ollama-installer-mac.sh
#
# The script will:
#   1. Check if Ollama is already installed
#   2. Download the official Ollama installer if needed
#   3. Install Ollama
#   4. Verify the installation
#   5. Optionally pull the phi3 model
#
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() { echo -e "${BLUE}[*]${NC} $1"; }
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[!]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo ""
echo "============================================"
echo "  Ollama Installer for macOS"
echo "  Required by LearnQuest"
echo "============================================"
echo ""

# ---------------------------------------------------------------------------
# Step 1: Check if Ollama is already installed
# ---------------------------------------------------------------------------
if command -v ollama &> /dev/null; then
    OLLAMA_VERSION=$(ollama --version 2>/dev/null || echo "unknown")
    print_success "Ollama is already installed (version: $OLLAMA_VERSION)"

    # Check if Ollama service is running
    if curl -s http://localhost:11434/ &> /dev/null; then
        print_success "Ollama service is running."
    else
        print_status "Starting Ollama service..."
        ollama serve &> /dev/null &
        sleep 3
        if curl -s http://localhost:11434/ &> /dev/null; then
            print_success "Ollama service started."
        else
            print_warning "Could not start Ollama service automatically."
            print_warning "You may need to start it manually: ollama serve"
        fi
    fi

    # Check for phi3 model
    if ollama list 2>/dev/null | grep -qi "phi3"; then
        print_success "phi3 model is already downloaded."
        echo ""
        print_success "Everything is ready for LearnQuest!"
        exit 0
    else
        print_warning "phi3 model is not downloaded yet."
        echo ""
        read -p "Download phi3 model now? (~2.3 GB) [Y/n]: " DOWNLOAD_MODEL
        DOWNLOAD_MODEL=${DOWNLOAD_MODEL:-Y}
        if [[ "$DOWNLOAD_MODEL" =~ ^[Yy] ]]; then
            print_status "Downloading phi3 model... This may take several minutes."
            ollama pull phi3
            print_success "phi3 model downloaded successfully!"
        else
            print_warning "Skipped model download. LearnQuest will download it on first launch."
        fi
    fi

    echo ""
    print_success "Ollama setup complete!"
    exit 0
fi

# ---------------------------------------------------------------------------
# Step 2: Detect system architecture
# ---------------------------------------------------------------------------
ARCH=$(uname -m)
print_status "Detected architecture: $ARCH"

if [[ "$ARCH" != "arm64" && "$ARCH" != "x86_64" ]]; then
    print_error "Unsupported architecture: $ARCH"
    print_error "Ollama supports Apple Silicon (arm64) and Intel (x86_64) Macs."
    exit 1
fi

# ---------------------------------------------------------------------------
# Step 3: Download Ollama
# ---------------------------------------------------------------------------
DOWNLOAD_URL="https://ollama.com/download/Ollama-darwin.zip"
TEMP_DIR=$(mktemp -d)
DOWNLOAD_PATH="$TEMP_DIR/Ollama-darwin.zip"

print_status "Downloading Ollama from $DOWNLOAD_URL ..."
echo ""

if command -v curl &> /dev/null; then
    curl -L --progress-bar -o "$DOWNLOAD_PATH" "$DOWNLOAD_URL"
elif command -v wget &> /dev/null; then
    wget --show-progress -O "$DOWNLOAD_PATH" "$DOWNLOAD_URL"
else
    print_error "Neither curl nor wget is available. Cannot download Ollama."
    print_error "Please install Ollama manually from https://ollama.com/download"
    rm -rf "$TEMP_DIR"
    exit 1
fi

if [ ! -f "$DOWNLOAD_PATH" ]; then
    print_error "Download failed. Please check your internet connection."
    rm -rf "$TEMP_DIR"
    exit 1
fi

print_success "Download complete."

# ---------------------------------------------------------------------------
# Step 4: Install Ollama
# ---------------------------------------------------------------------------
print_status "Installing Ollama..."

# Unzip the downloaded file
cd "$TEMP_DIR"
unzip -q "$DOWNLOAD_PATH" -d "$TEMP_DIR"

# Move the app to /Applications
if [ -d "$TEMP_DIR/Ollama.app" ]; then
    if [ -d "/Applications/Ollama.app" ]; then
        print_warning "Existing Ollama.app found. Replacing..."
        rm -rf "/Applications/Ollama.app"
    fi

    mv "$TEMP_DIR/Ollama.app" "/Applications/Ollama.app"
    print_success "Ollama.app installed to /Applications/"
else
    print_error "Could not find Ollama.app in the downloaded archive."
    print_error "Please install Ollama manually from https://ollama.com/download"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# Clean up temp files
rm -rf "$TEMP_DIR"

# ---------------------------------------------------------------------------
# Step 5: Launch Ollama and verify
# ---------------------------------------------------------------------------
print_status "Launching Ollama..."

# Open the Ollama app (this starts the service and adds CLI to PATH)
open -a Ollama

# Wait for Ollama to start
print_status "Waiting for Ollama to initialize..."
MAX_WAIT=30
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s http://localhost:11434/ &> /dev/null; then
        break
    fi
    sleep 1
    WAITED=$((WAITED + 1))
done

if curl -s http://localhost:11434/ &> /dev/null; then
    print_success "Ollama is running!"
else
    print_warning "Ollama may still be starting up."
    print_warning "If the ollama command is not found, you may need to restart your terminal."
fi

# ---------------------------------------------------------------------------
# Step 6: Download phi3 model
# ---------------------------------------------------------------------------
echo ""
read -p "Download the phi3 AI model now? (~2.3 GB) [Y/n]: " DOWNLOAD_MODEL
DOWNLOAD_MODEL=${DOWNLOAD_MODEL:-Y}

if [[ "$DOWNLOAD_MODEL" =~ ^[Yy] ]]; then
    print_status "Downloading phi3 model... This may take several minutes."
    echo ""

    # Ensure ollama CLI is available (might need to use the full path)
    OLLAMA_CMD="ollama"
    if ! command -v ollama &> /dev/null; then
        OLLAMA_CMD="/usr/local/bin/ollama"
    fi

    $OLLAMA_CMD pull phi3

    if [ $? -eq 0 ]; then
        print_success "phi3 model downloaded successfully!"
    else
        print_error "Failed to download phi3 model."
        print_error "You can try again later by running: ollama pull phi3"
    fi
else
    print_warning "Skipped model download."
    print_warning "LearnQuest will download the model when you first launch it."
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo "============================================"
echo "  Installation Complete"
echo "============================================"
echo ""
print_success "Ollama has been installed successfully!"
echo ""
echo "  You can now run LearnQuest."
echo "  Ollama will start automatically when you launch LearnQuest."
echo ""
echo "  Useful commands:"
echo "    ollama list          - List downloaded models"
echo "    ollama pull phi3     - Download the phi3 model"
echo "    ollama serve         - Start the Ollama service"
echo ""
