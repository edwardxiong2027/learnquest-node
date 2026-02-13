# =============================================================================
# Ollama Installer for Windows
# =============================================================================
#
# Downloads and installs Ollama on Windows. This script is used by LearnQuest
# to ensure Ollama is available for AI tutoring features.
#
# USAGE (run in PowerShell):
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\ollama-installer-win.ps1
#
# The script will:
#   1. Check if Ollama is already installed
#   2. Download the official Ollama installer if needed
#   3. Run the installer
#   4. Verify the installation
#   5. Optionally pull the phi3 model
#
# =============================================================================

# Require PowerShell 5.1+
#Requires -Version 5.1

$ErrorActionPreference = "Stop"

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------
function Write-Status($msg)  { Write-Host "[*] $msg" -ForegroundColor Cyan }
function Write-Success($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg)    { Write-Host "[!] $msg" -ForegroundColor Yellow }
function Write-Err($msg)     { Write-Host "[ERROR] $msg" -ForegroundColor Red }

function Test-OllamaInstalled {
    try {
        $null = Get-Command ollama -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

function Test-OllamaRunning {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:11434/" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "============================================" -ForegroundColor White
Write-Host "  Ollama Installer for Windows" -ForegroundColor White
Write-Host "  Required by LearnQuest" -ForegroundColor White
Write-Host "============================================" -ForegroundColor White
Write-Host ""

# ---------------------------------------------------------------------------
# Step 1: Check if Ollama is already installed
# ---------------------------------------------------------------------------
if (Test-OllamaInstalled) {
    try {
        $version = & ollama --version 2>$null
        Write-Success "Ollama is already installed ($version)"
    } catch {
        Write-Success "Ollama is already installed."
    }

    # Check if service is running
    if (Test-OllamaRunning) {
        Write-Success "Ollama service is running."
    } else {
        Write-Status "Starting Ollama service..."
        Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
        Start-Sleep -Seconds 5

        if (Test-OllamaRunning) {
            Write-Success "Ollama service started."
        } else {
            Write-Warn "Could not start Ollama service automatically."
            Write-Warn "Try starting it manually: ollama serve"
        }
    }

    # Check for phi3 model
    $models = & ollama list 2>$null
    if ($models -match "phi3") {
        Write-Success "phi3 model is already downloaded."
        Write-Host ""
        Write-Success "Everything is ready for LearnQuest!"
        exit 0
    } else {
        Write-Warn "phi3 model is not downloaded yet."
        Write-Host ""
        $download = Read-Host "Download phi3 model now? (~2.3 GB) [Y/n]"
        if ($download -eq "" -or $download -match "^[Yy]") {
            Write-Status "Downloading phi3 model... This may take several minutes."
            & ollama pull phi3
            if ($LASTEXITCODE -eq 0) {
                Write-Success "phi3 model downloaded successfully!"
            } else {
                Write-Err "Failed to download phi3 model."
                Write-Err "You can try again later: ollama pull phi3"
            }
        } else {
            Write-Warn "Skipped. LearnQuest will download the model on first launch."
        }
    }

    Write-Host ""
    Write-Success "Ollama setup complete!"
    exit 0
}

# ---------------------------------------------------------------------------
# Step 2: Detect system architecture
# ---------------------------------------------------------------------------
$arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture
Write-Status "Detected architecture: $arch"

# ---------------------------------------------------------------------------
# Step 3: Download Ollama installer
# ---------------------------------------------------------------------------
$downloadUrl = "https://ollama.com/download/OllamaSetup.exe"
$tempDir = Join-Path $env:TEMP "ollama-install"
$installerPath = Join-Path $tempDir "OllamaSetup.exe"

# Create temp directory
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
}

Write-Status "Downloading Ollama from $downloadUrl ..."
Write-Host ""

try {
    # Use BITS for better download experience with progress
    $bitsSupported = $true
    try {
        Import-Module BitsTransfer -ErrorAction Stop
    } catch {
        $bitsSupported = $false
    }

    if ($bitsSupported) {
        Start-BitsTransfer -Source $downloadUrl -Destination $installerPath -DisplayName "Downloading Ollama"
    } else {
        # Fallback to Invoke-WebRequest with progress
        $ProgressPreference = 'Continue'
        Invoke-WebRequest -Uri $downloadUrl -OutFile $installerPath -UseBasicParsing
    }
} catch {
    Write-Err "Download failed: $_"
    Write-Err "Please download Ollama manually from https://ollama.com/download"

    # Open the download page in the browser
    Start-Process "https://ollama.com/download"

    # Clean up
    if (Test-Path $tempDir) { Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue }
    exit 1
}

if (-not (Test-Path $installerPath)) {
    Write-Err "Download failed. The installer file was not saved."
    if (Test-Path $tempDir) { Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue }
    exit 1
}

$fileSize = (Get-Item $installerPath).Length / 1MB
Write-Success "Download complete ($([math]::Round($fileSize, 1)) MB)"

# ---------------------------------------------------------------------------
# Step 4: Run the installer
# ---------------------------------------------------------------------------
Write-Status "Running Ollama installer..."
Write-Host ""
Write-Host "  The Ollama installer will now open." -ForegroundColor White
Write-Host "  Please follow the installation prompts." -ForegroundColor White
Write-Host "  This script will continue after installation completes." -ForegroundColor White
Write-Host ""

try {
    # Run the installer and wait for it to complete
    $process = Start-Process -FilePath $installerPath -Wait -PassThru

    if ($process.ExitCode -ne 0) {
        Write-Warn "Installer exited with code $($process.ExitCode)."
        Write-Warn "Installation may have been cancelled or encountered an issue."
    }
} catch {
    Write-Err "Failed to run installer: $_"
    Write-Err "Please run the installer manually: $installerPath"
    exit 1
}

# Clean up temp files
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

# ---------------------------------------------------------------------------
# Step 5: Verify installation
# ---------------------------------------------------------------------------
Write-Host ""
Write-Status "Verifying installation..."

# Refresh PATH (installer may have modified it)
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

# Wait a moment for Ollama to become available
Start-Sleep -Seconds 3

if (Test-OllamaInstalled) {
    Write-Success "Ollama installed successfully!"
} else {
    Write-Warn "Ollama command not found in PATH."
    Write-Warn "You may need to restart your terminal or computer."
    Write-Warn "If the issue persists, try installing manually from https://ollama.com/download"
    exit 1
}

# Start Ollama service if not already running
if (-not (Test-OllamaRunning)) {
    Write-Status "Starting Ollama service..."
    Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 5
}

if (Test-OllamaRunning) {
    Write-Success "Ollama service is running!"
} else {
    Write-Warn "Ollama service is not running yet. It may need a moment to start."
}

# ---------------------------------------------------------------------------
# Step 6: Download phi3 model
# ---------------------------------------------------------------------------
Write-Host ""
$download = Read-Host "Download the phi3 AI model now? (~2.3 GB) [Y/n]"

if ($download -eq "" -or $download -match "^[Yy]") {
    Write-Status "Downloading phi3 model... This may take several minutes."
    Write-Host ""

    & ollama pull phi3

    if ($LASTEXITCODE -eq 0) {
        Write-Success "phi3 model downloaded successfully!"
    } else {
        Write-Err "Failed to download phi3 model."
        Write-Err "You can try again later by running: ollama pull phi3"
    }
} else {
    Write-Warn "Skipped model download."
    Write-Warn "LearnQuest will download the model when you first launch it."
}

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "============================================" -ForegroundColor White
Write-Host "  Installation Complete" -ForegroundColor White
Write-Host "============================================" -ForegroundColor White
Write-Host ""
Write-Success "Ollama has been installed successfully!"
Write-Host ""
Write-Host "  You can now run LearnQuest." -ForegroundColor White
Write-Host "  Ollama will start automatically when you launch LearnQuest." -ForegroundColor White
Write-Host ""
Write-Host "  Useful commands:" -ForegroundColor White
Write-Host "    ollama list          - List downloaded models" -ForegroundColor Gray
Write-Host "    ollama pull phi3     - Download the phi3 model" -ForegroundColor Gray
Write-Host "    ollama serve         - Start the Ollama service" -ForegroundColor Gray
Write-Host ""
