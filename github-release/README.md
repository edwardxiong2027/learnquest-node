# LearnQuest -- Free Offline K-8 Tutoring Platform

**A complete Khan Academy-like learning platform that runs entirely on your computer. No internet needed. No accounts. No data collection. Free forever.**

LearnQuest uses a local AI model (Phi-3 Mini via Ollama) to provide personalized tutoring for every student -- like having a patient, knowledgeable tutor available 24/7, right on your own machine.

> **Looking for one-click installers?** Download the [Mac .app](https://github.com/edwardxiong2027/LearnQuest-Node/releases/latest/download/LearnQuest-Mac-AppleSilicon.zip) or [Windows .exe](https://github.com/edwardxiong2027/LearnQuest-Node/releases/latest/download/LearnQuest-Windows-Setup.exe) from [Releases](https://github.com/edwardxiong2027/LearnQuest-Node/releases).

---

## Features

- **Complete K-8 Curriculum** -- Math, Science, ELA, Social Studies with hundreds of lessons and thousands of practice problems
- **AI Tutor** -- Ask questions and get personalized, Socratic explanations using a local AI model (no internet!)
- **Quizzes & Practice** -- Auto-generated practice problems with instant feedback and step-by-step solutions
- **Gamification** -- XP points, levels, badges, daily streaks, leaderboard, and customizable avatars
- **Teacher Dashboard** -- Track student progress, assign work, export reports as CSV
- **Flashcards & Notes** -- Spaced-repetition flashcards and per-lesson note-taking
- **AI Studio** -- Generate custom worksheets, quizzes, and lesson plans with AI
- **100% Private** -- All data stays on your computer. FERPA/COPPA compliant by design
- **Works Offline** -- No internet needed after initial setup
- **Math Accuracy** -- Math answers computed by code (mathjs), not AI -- ensuring correctness
- **Search & Bookmarks** -- Full-text search across the entire curriculum with bookmarking

---

## Versions

| Version | Tech Stack | Best For | Repository |
|---|---|---|---|
| **LearnQuest Node** (recommended) | Node.js + Express | One-click install, Mac .app, Windows .exe | [This repo](https://github.com/edwardxiong2027/LearnQuest-Node) |
| **LearnQuest Python** | Python + Flask | Developers, advanced users, terminal install | [LearnQuest](https://github.com/edwardxiong2027/LearnQuest) |

Both versions use the same curriculum, the same AI model (Phi-3 Mini via Ollama), and the same frontend. The Node.js version eliminates the Python dependency and adds one-click installers.

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [Ollama](https://ollama.com/) installed

### Install & Run

```bash
# Clone the repository
git clone https://github.com/edwardxiong2027/LearnQuest-Node.git
cd LearnQuest-Node

# Install dependencies
npm install

# Download the AI model (one-time, ~2.3 GB)
ollama pull phi3

# Start LearnQuest
npm start
```

Open **http://localhost:5000** in your browser. That's it!

### Or use the setup script

**Mac / Linux:**
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

**Windows:**
```batch
scripts\setup.bat
```

---

## One-Click Downloads

Don't want to use the terminal? Download the installer for your platform:

| Platform | Download | Size | Requirements |
|---|---|---|---|
| Mac (Apple Silicon) | [LearnQuest.app](https://github.com/edwardxiong2027/LearnQuest-Node/releases/latest/download/LearnQuest-Mac-AppleSilicon.zip) | ~50 MB + 2.3 GB model | macOS 10.15+, 8 GB RAM |
| Mac (Intel) | [LearnQuest-Intel.app](https://github.com/edwardxiong2027/LearnQuest-Node/releases/latest/download/LearnQuest-Mac-Intel.zip) | ~50 MB + 2.3 GB model | macOS 10.15+, 8 GB RAM |
| Windows | [LearnQuest-Setup.exe](https://github.com/edwardxiong2027/LearnQuest-Node/releases/latest/download/LearnQuest-Windows-Setup.exe) | ~50 MB + 2.3 GB model | Windows 10+, 8 GB RAM |

*The AI model (2.3 GB) downloads automatically on first launch. Internet is only needed once.*

---

## For Schools

LearnQuest is designed for school and classroom deployment:

- **USB Installation** -- Copy to a USB drive and run on any computer without installing anything to the host machine
- **Network Mode** -- One computer runs LearnQuest; all classroom devices connect via browser on the same WiFi network
- **No Student Data Collection** -- Everything is stored locally. No cloud. No telemetry. No tracking
- **No Recurring Costs** -- Free forever. No subscriptions, no per-seat licenses
- **Simple Administration** -- Teachers manage students with names and PINs (no emails required)
- **Progress Reports** -- Export detailed progress reports as CSV for parent-teacher conferences
- **FERPA/COPPA Compliant** -- By design, since no data ever leaves the local machine

---

## What's Inside

- Complete K-8 curriculum (Math, Science, ELA, Social Studies)
- AI-powered personal tutor -- explains concepts, gives hints, never gives away answers
- Hundreds of practice problems and quizzes per subject
- Gamification -- XP, levels (1-50), badges, daily streaks, class leaderboard
- Teacher dashboard -- track progress, assign work, export reports
- Flashcards with spaced repetition (Leitner system)
- AI Studio for generating custom content
- Full-text search across all curriculum content
- Bookmarks and notes for every lesson
- 100% offline after setup -- works without internet
- 100% private -- no student data ever leaves the computer
- Math answers verified by code, not AI -- guaranteed accuracy

---

## Tech Stack

- **Runtime**: Node.js (v18+)
- **Backend**: Express.js
- **Database**: SQLite via better-sqlite3
- **AI Model**: Phi-3 Mini via Ollama (runs locally)
- **Frontend**: Vanilla HTML / CSS / JavaScript (no frameworks, no build step)
- **Math Engine**: mathjs library for deterministic computation and answer validation
- **Packaging**: Native Node.js -- no bundlers, no transpilers

---

## Documentation

- [Installation Guide](docs/INSTALLATION.md) -- Detailed setup instructions for all platforms
- [Teacher Guide](docs/TEACHER_GUIDE.md) -- How to manage students, track progress, and use the dashboard
- [Architecture Overview](docs/ARCHITECTURE.md) -- Technical deep-dive into the codebase
- [Contributing](docs/CONTRIBUTING.md) -- How to contribute to LearnQuest

---

## Website

Visit [learnquest2026.web.app](https://learnquest2026.web.app/) for downloads, documentation, and more information.

---

## License

MIT -- Use it, modify it, share it. Free forever.

Copyright (c) 2026 LearnQuest. See [LICENSE](LICENSE) for details.
