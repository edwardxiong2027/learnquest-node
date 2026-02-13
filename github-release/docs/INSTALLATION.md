# Installation Guide

This guide covers all methods for installing and running LearnQuest on Mac, Windows, and Linux.

---

## System Requirements

| Component | Minimum | Recommended |
|---|---|---|
| RAM | 4 GB | 8 GB or more |
| Disk Space | 3 GB (app + AI model) | 5 GB |
| OS | macOS 10.15+, Windows 10+, Ubuntu 20.04+ | Latest version |
| Node.js | v18.0.0 | v20 LTS or later |
| Browser | Any modern browser | Chrome, Firefox, Safari, Edge |

The AI model (Phi-3 Mini) requires approximately 2.3 GB of disk space and runs entirely on your CPU. A machine with 8 GB of RAM will provide the best experience.

---

## Quick Install

### Mac

```bash
# Install Node.js (if not installed)
brew install node

# Clone and set up LearnQuest
git clone https://github.com/edwardxiong2027/LearnQuest-Node.git
cd LearnQuest-Node
chmod +x scripts/setup.sh
./scripts/setup.sh

# Start LearnQuest
./scripts/start.sh
```

### Windows

1. Install [Node.js](https://nodejs.org/) (v18 or later) -- download the LTS installer.
2. Install [Ollama](https://ollama.com/download) -- download the Windows installer.
3. Open Command Prompt or PowerShell:

```batch
git clone https://github.com/edwardxiong2027/LearnQuest-Node.git
cd LearnQuest-Node
scripts\setup.bat
scripts\start.bat
```

### Linux (Ubuntu / Debian)

```bash
# Install Node.js (if not installed)
sudo apt update
sudo apt install nodejs npm

# Clone and set up LearnQuest
git clone https://github.com/edwardxiong2027/LearnQuest-Node.git
cd LearnQuest-Node
chmod +x scripts/setup.sh
./scripts/setup.sh

# Start LearnQuest
./scripts/start.sh
```

### Linux (Fedora / RHEL)

```bash
sudo dnf install nodejs npm
git clone https://github.com/edwardxiong2027/LearnQuest-Node.git
cd LearnQuest-Node
chmod +x scripts/setup.sh
./scripts/setup.sh
./scripts/start.sh
```

---

## Manual Install (Step by Step)

If the setup script does not work for your environment, follow these steps manually.

### Step 1: Install Node.js

Download and install Node.js v18 or later from [nodejs.org](https://nodejs.org/). Verify the installation:

```bash
node --version    # Should show v18.x.x or later
npm --version     # Should show 9.x.x or later
```

### Step 2: Install Ollama

Ollama is the local AI engine that runs the Phi-3 model.

**Mac / Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Download the installer from [ollama.com/download](https://ollama.com/download).

Verify the installation:
```bash
ollama --version
```

### Step 3: Start Ollama

```bash
ollama serve
```

Leave this running in a separate terminal window (or it will run as a background service on some systems).

### Step 4: Download the AI Model

```bash
ollama pull phi3
```

This downloads the Phi-3 Mini model (~2.3 GB). It only needs to be done once. The model is stored locally by Ollama.

### Step 5: Clone the Repository

```bash
git clone https://github.com/edwardxiong2027/LearnQuest-Node.git
cd LearnQuest-Node
```

### Step 6: Install Dependencies

```bash
npm install
```

This installs Express, better-sqlite3, mathjs, and other dependencies.

**Note:** `better-sqlite3` includes a native C++ addon that is compiled during install. If you encounter build errors, ensure you have a C++ compiler installed:
- **Mac:** Install Xcode Command Line Tools: `xcode-select --install`
- **Windows:** Install the "Desktop development with C++" workload from Visual Studio Build Tools
- **Linux:** `sudo apt install build-essential python3`

### Step 7: Start LearnQuest

```bash
npm start
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

### Step 8: First-Time Setup

On first launch, you will be guided through a setup wizard in the browser:
1. The system checks if Ollama and the AI model are ready.
2. You create your teacher account (or use the default: name `teacher`, PIN `1234`).
3. You are redirected to the main dashboard.

---

## One-Click Installers

If you prefer not to use the terminal, download the pre-built installer for your platform:

| Platform | Download |
|---|---|
| Mac (Apple Silicon - M1/M2/M3/M4) | [LearnQuest.app](https://github.com/edwardxiong2027/LearnQuest-Node/releases/latest/download/LearnQuest-Mac-AppleSilicon.zip) |
| Mac (Intel) | [LearnQuest-Intel.app](https://github.com/edwardxiong2027/LearnQuest-Node/releases/latest/download/LearnQuest-Mac-Intel.zip) |
| Windows | [LearnQuest-Setup.exe](https://github.com/edwardxiong2027/LearnQuest-Node/releases/latest/download/LearnQuest-Windows-Setup.exe) |

---

## USB Drive Installation

LearnQuest can run entirely from a USB drive without installing anything to the host machine.

1. Copy the entire `LearnQuest-Node` folder to a USB drive.
2. On the USB drive, run `npm install` once (this installs dependencies into `node_modules/` on the USB).
3. Plug the USB into any computer with Node.js and Ollama installed.
4. Run `./scripts/start.sh` (Mac/Linux) or `scripts\start.bat` (Windows).

To store the AI model on the USB as well, create an `ollama_models/` directory in the project root. The start script will automatically detect it and use it as the model storage location.

---

## Network Setup (Classroom Access)

LearnQuest binds to `0.0.0.0:5000`, which means other devices on the same WiFi network can connect to it.

### Setup

1. Start LearnQuest on the teacher's computer.
2. Find the teacher's computer IP address:
   - **Mac:** System Preferences > Network, or run `ifconfig | grep "inet "`
   - **Windows:** Open Command Prompt and run `ipconfig`
   - **Linux:** Run `ip addr` or `hostname -I`
3. On student devices (tablets, Chromebooks, laptops), open a browser and navigate to:
   ```
   http://<teacher-computer-ip>:5000
   ```
   For example: `http://192.168.1.42:5000`

### Firewall Configuration

If student devices cannot connect, you may need to allow port 5000 through the firewall:

**Mac:**
Port 5000 is typically allowed by default on macOS.

**Windows:**
```batch
netsh advfirewall firewall add rule name="LearnQuest" dir=in action=allow protocol=TCP localport=5000
```

**Linux:**
```bash
sudo ufw allow 5000/tcp
```

### Changing the Port

To run on a different port, set the `PORT` environment variable:

```bash
PORT=8080 npm start
```

Or on Windows:
```batch
set PORT=8080
npm start
```

---

## Troubleshooting

### "Command not found: node"

Node.js is not installed or not in your system PATH. Install it from [nodejs.org](https://nodejs.org/).

### "Command not found: ollama"

Ollama is not installed. Install it from [ollama.com](https://ollama.com/).

### "npm install" fails with native module errors

The `better-sqlite3` package requires a C++ compiler. See Step 6 above for platform-specific instructions.

### "EADDRINUSE: address already in use :::5000"

Another process is using port 5000. Either stop that process or run LearnQuest on a different port:
```bash
PORT=3000 npm start
```

### Ollama is not responding

1. Check if Ollama is running: `curl http://localhost:11434/`
2. If not, start it: `ollama serve`
3. If it fails to start, check Ollama's logs or reinstall it.

### The AI tutor is not responding

1. Verify Ollama is running (see above).
2. Verify the Phi-3 model is downloaded: `ollama list` should show `phi3`.
3. If the model is missing: `ollama pull phi3`

### Slow AI responses

The Phi-3 model runs on CPU by default. Response times depend on your hardware:
- Modern laptop (2020+): 2-5 seconds per response
- Older hardware: 5-15 seconds per response
- Machine with GPU: near-instant responses (if Ollama detects a compatible GPU)

### Database errors

If you see SQLite errors, the database file may be corrupted. Delete `database/learnquest.db` and restart -- it will be recreated automatically. Note that this will delete all student data.

### Mac: "LearnQuest.app is damaged and can't be opened"

This happens because the app is not signed with an Apple Developer certificate. To bypass:
1. Right-click the app and select "Open" (instead of double-clicking).
2. Or go to System Preferences > Security & Privacy > General and click "Open Anyway".
3. Or run: `xattr -cr /path/to/LearnQuest.app`

---

## Updating LearnQuest

If you installed via `git clone`:

```bash
cd LearnQuest-Node
git pull
npm install
```

If you used the one-click installer, download the latest version from the [Releases page](https://github.com/edwardxiong2027/LearnQuest-Node/releases).

---

## Uninstalling

LearnQuest does not install anything outside its own directory (except Ollama, if installed during setup).

1. Delete the `LearnQuest-Node` folder.
2. Optionally uninstall Ollama if you no longer need it.
3. Optionally remove the Phi-3 model: `ollama rm phi3`
