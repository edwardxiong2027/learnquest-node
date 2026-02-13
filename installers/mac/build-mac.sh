#!/bin/bash
set -e

# ============================================================================
# LearnQuest Mac .app Builder
# ============================================================================
# Builds a self-contained LearnQuest.app bundle with a bundled Node.js binary.
# Detects architecture (arm64 vs x64) and downloads the appropriate Node.js.
#
# Usage:
#   ./build-mac.sh              # Build for current architecture
#   ./build-mac.sh --arm64      # Force Apple Silicon build
#   ./build-mac.sh --x64        # Force Intel build
#   ./build-mac.sh --universal  # Build both versions
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
APP_SRC="$ROOT_DIR/learnquest-app"
BUILD_DIR="$SCRIPT_DIR/build"
NODE_VERSION="v20.11.0"
NODE_BASE_URL="https://nodejs.org/dist/${NODE_VERSION}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================================================
# Parse arguments
# ============================================================================
BUILD_ARM64=false
BUILD_X64=false

case "${1:-}" in
    --arm64)
        BUILD_ARM64=true
        ;;
    --x64)
        BUILD_X64=true
        ;;
    --universal)
        BUILD_ARM64=true
        BUILD_X64=true
        ;;
    "")
        # Auto-detect
        ARCH=$(uname -m)
        if [ "$ARCH" = "arm64" ]; then
            BUILD_ARM64=true
        else
            BUILD_X64=true
        fi
        ;;
    *)
        echo "Usage: $0 [--arm64 | --x64 | --universal]"
        exit 1
        ;;
esac

# ============================================================================
# Verify source app exists
# ============================================================================
if [ ! -f "$APP_SRC/server.js" ]; then
    log_error "Cannot find learnquest-app/server.js at: $APP_SRC"
    log_error "Make sure you run this script from the LearnQuest-node directory."
    exit 1
fi

if [ ! -d "$APP_SRC/node_modules" ]; then
    log_error "node_modules not found in $APP_SRC"
    log_error "Run 'npm install' in learnquest-app/ first."
    exit 1
fi

# ============================================================================
# Build function for a single architecture
# ============================================================================
build_app() {
    local TARGET_ARCH="$1"   # "arm64" or "x64"
    local NODE_URL=""
    local APP_NAME=""

    if [ "$TARGET_ARCH" = "arm64" ]; then
        NODE_URL="${NODE_BASE_URL}/node-${NODE_VERSION}-darwin-arm64.tar.gz"
        APP_NAME="LearnQuest.app"
    else
        NODE_URL="${NODE_BASE_URL}/node-${NODE_VERSION}-darwin-x64.tar.gz"
        APP_NAME="LearnQuest-Intel.app"
    fi

    log_info "========================================="
    log_info "Building $APP_NAME ($TARGET_ARCH)"
    log_info "========================================="

    local APP_PATH="$BUILD_DIR/$APP_NAME"

    # Remove previous build of this variant
    if [ -d "$APP_PATH" ]; then
        log_info "Removing previous build: $APP_PATH"
        rm -rf "$APP_PATH"
    fi

    # ------------------------------------------------------------------
    # Create .app bundle directory structure
    # ------------------------------------------------------------------
    log_info "Creating .app bundle structure..."
    mkdir -p "$APP_PATH/Contents/MacOS"
    mkdir -p "$APP_PATH/Contents/Resources/app"
    mkdir -p "$APP_PATH/Contents/Resources/ollama_models"

    # ------------------------------------------------------------------
    # Download Node.js binary
    # ------------------------------------------------------------------
    local NODE_TAR="$BUILD_DIR/node-${TARGET_ARCH}.tar.gz"

    if [ -f "$NODE_TAR" ]; then
        log_info "Using cached Node.js download for $TARGET_ARCH"
    else
        log_info "Downloading Node.js ${NODE_VERSION} for ${TARGET_ARCH}..."
        curl -L --progress-bar -o "$NODE_TAR" "$NODE_URL"

        if [ ! -f "$NODE_TAR" ] || [ ! -s "$NODE_TAR" ]; then
            log_error "Failed to download Node.js from $NODE_URL"
            exit 1
        fi
    fi

    # ------------------------------------------------------------------
    # Extract just the node binary
    # ------------------------------------------------------------------
    log_info "Extracting Node.js binary..."
    local EXTRACT_DIR="$BUILD_DIR/node-extract-${TARGET_ARCH}"
    rm -rf "$EXTRACT_DIR"
    mkdir -p "$EXTRACT_DIR"
    tar -xzf "$NODE_TAR" -C "$EXTRACT_DIR"

    local NODE_DIR
    NODE_DIR=$(ls -d "$EXTRACT_DIR"/node-* 2>/dev/null | head -1)

    if [ -z "$NODE_DIR" ] || [ ! -f "$NODE_DIR/bin/node" ]; then
        log_error "Could not find node binary in extracted tarball."
        exit 1
    fi

    cp "$NODE_DIR/bin/node" "$APP_PATH/Contents/Resources/node"
    chmod +x "$APP_PATH/Contents/Resources/node"
    log_ok "Node.js binary extracted"

    # Clean up extraction directory (keep tarball for potential re-use)
    rm -rf "$EXTRACT_DIR"

    # ------------------------------------------------------------------
    # Copy application files
    # ------------------------------------------------------------------
    log_info "Copying application files..."

    # Core files
    cp "$APP_SRC/server.js"      "$APP_PATH/Contents/Resources/app/"
    cp "$APP_SRC/package.json"   "$APP_PATH/Contents/Resources/app/"

    # Directories
    local DIRS_TO_COPY=("src" "public" "templates" "content" "prompts" "database" "node_modules")

    for dir in "${DIRS_TO_COPY[@]}"; do
        if [ -d "$APP_SRC/$dir" ]; then
            cp -R "$APP_SRC/$dir" "$APP_PATH/Contents/Resources/app/"
            log_ok "  Copied $dir/"
        else
            log_warn "  Directory $dir/ not found in source, skipping"
        fi
    done

    # Remove any existing SQLite database from the bundle (will be created fresh)
    rm -f "$APP_PATH/Contents/Resources/app/database/learnquest.db"

    # ------------------------------------------------------------------
    # Copy Info.plist
    # ------------------------------------------------------------------
    if [ -f "$SCRIPT_DIR/Info.plist" ]; then
        cp "$SCRIPT_DIR/Info.plist" "$APP_PATH/Contents/"
        log_ok "Info.plist copied"
    else
        log_error "Info.plist not found at $SCRIPT_DIR/Info.plist"
        exit 1
    fi

    # ------------------------------------------------------------------
    # Copy launcher script
    # ------------------------------------------------------------------
    if [ -f "$SCRIPT_DIR/launcher.sh" ]; then
        cp "$SCRIPT_DIR/launcher.sh" "$APP_PATH/Contents/MacOS/LearnQuest"
        chmod +x "$APP_PATH/Contents/MacOS/LearnQuest"
        log_ok "Launcher script installed"
    else
        log_error "launcher.sh not found at $SCRIPT_DIR/launcher.sh"
        exit 1
    fi

    # ------------------------------------------------------------------
    # Copy icon if available
    # ------------------------------------------------------------------
    if [ -f "$SCRIPT_DIR/icon.icns" ]; then
        cp "$SCRIPT_DIR/icon.icns" "$APP_PATH/Contents/Resources/icon.icns"
        log_ok "App icon copied"
    else
        log_warn "No icon.icns found. App will use default macOS icon."
        log_warn "Place icon.icns in $SCRIPT_DIR to include it."
    fi

    # ------------------------------------------------------------------
    # Calculate bundle size
    # ------------------------------------------------------------------
    local BUNDLE_SIZE
    BUNDLE_SIZE=$(du -sh "$APP_PATH" | awk '{print $1}')

    log_info ""
    log_ok "========================================="
    log_ok "Built: $APP_PATH"
    log_ok "Size:  $BUNDLE_SIZE"
    log_ok "========================================="
    log_info ""
    log_info "To create a distributable zip:"
    log_info "  cd '$BUILD_DIR' && zip -r -y '${APP_NAME%.app}.zip' '$APP_NAME'"
    log_info ""
}

# ============================================================================
# Clean and create build directory
# ============================================================================
mkdir -p "$BUILD_DIR"
log_info "Build directory: $BUILD_DIR"

# ============================================================================
# Run builds
# ============================================================================
if [ "$BUILD_ARM64" = true ]; then
    build_app "arm64"
fi

if [ "$BUILD_X64" = true ]; then
    build_app "x64"
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
log_ok "============================================"
log_ok "  Build complete!"
log_ok "============================================"

if [ "$BUILD_ARM64" = true ] && [ "$BUILD_X64" = true ]; then
    log_info "Built both Apple Silicon and Intel versions."
    log_info ""
    log_info "To create distributable zips:"
    log_info "  cd '$BUILD_DIR'"
    log_info "  zip -r -y 'LearnQuest-Mac-AppleSilicon.zip' 'LearnQuest.app'"
    log_info "  zip -r -y 'LearnQuest-Mac-Intel.zip' 'LearnQuest-Intel.app'"
fi

# Clean up cached tarballs
log_info ""
read -p "Clean up cached Node.js downloads? [y/N] " -r REPLY
if [[ "$REPLY" =~ ^[Yy]$ ]]; then
    rm -f "$BUILD_DIR"/node-*.tar.gz
    log_ok "Cached downloads removed."
fi
