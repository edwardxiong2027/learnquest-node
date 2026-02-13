# Architecture Overview

This document describes the technical architecture of LearnQuest, including the tech stack, directory structure, API endpoints, database schema, math engine, and LLM integration.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [High-Level Architecture](#high-level-architecture)
3. [Directory Structure](#directory-structure)
4. [Server Entry Point](#server-entry-point)
5. [API Endpoints](#api-endpoints)
6. [Database Schema](#database-schema)
7. [Math Engine](#math-engine)
8. [LLM Integration](#llm-integration)
9. [Frontend Architecture](#frontend-architecture)
10. [Curriculum Content Format](#curriculum-content-format)
11. [Caching Strategy](#caching-strategy)
12. [Session Management](#session-management)
13. [Deployment Modes](#deployment-modes)

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Node.js v18+ | Server-side JavaScript execution |
| Web Framework | Express.js v4 | HTTP routing, middleware, static file serving |
| Database | SQLite via better-sqlite3 | Persistent storage for users, progress, settings |
| AI Model | Phi-3 Mini via Ollama | Local LLM for tutoring, hints, and content generation |
| Math | mathjs v12 | Deterministic math computation and answer validation |
| Frontend | Vanilla HTML/CSS/JS | Single-page application with no framework dependencies |
| Compression | compression (Express middleware) | Gzip compression for HTTP responses |
| IDs | uuid v9 | Generating unique session and entity identifiers |

**Design principle:** No build tools, no TypeScript, no frontend frameworks. Everything runs as-is with `node server.js`.

---

## High-Level Architecture

```
+-------------------+     HTTP      +-------------------+     HTTP      +----------------+
|                   | ------------> |                   | ------------> |                |
|  Browser (SPA)    |               |  Express Server   |               |  Ollama (LLM)  |
|  HTML/CSS/JS      | <------------ |  Node.js          | <------------ |  Phi-3 Mini    |
|                   |   JSON/SSE    |                   |   JSON/SSE    |  localhost:11434|
+-------------------+               +-------------------+               +----------------+
                                           |
                                           | SQL
                                           v
                                    +----------------+
                                    |                |
                                    |  SQLite DB     |
                                    |  learnquest.db |
                                    |                |
                                    +----------------+
```

- The **browser** loads the SPA shell (`templates/index.html`) and all static assets from `public/`.
- The **Express server** handles API requests, serves static files, and acts as a proxy to Ollama.
- **Ollama** runs locally and serves the Phi-3 Mini model for AI tutoring.
- **SQLite** stores all persistent data: users, progress, quiz results, badges, settings.
- The **math engine** runs in-process (no external service) for deterministic computation.

---

## Directory Structure

```
LearnQuest-Node/
├── server.js                        # Express server -- entry point
├── package.json                     # Dependencies and npm scripts
├── src/
│   ├── database.js                  # SQLite initialization, schema, helpers
│   ├── cache.js                     # LLM response cache (SQLite-backed)
│   ├── ollama-client.js             # Ollama HTTP client with queue and retry
│   ├── utils.js                     # Shared utility functions
│   ├── routes/
│   │   ├── auth.js                  # POST /api/auth/login, /api/auth/register
│   │   ├── curriculum.js            # GET /api/curriculum, /api/curriculum/:subject/:grade, /api/lesson/:id
│   │   ├── tutor.js                 # POST /api/tutor/chat, /api/tutor/hint
│   │   ├── quiz.js                  # GET /api/quiz/:unitId, POST /api/quiz/submit, /api/quiz/generate
│   │   ├── progress.js              # GET /api/progress/:studentId, /api/progress/badges
│   │   ├── math.js                  # POST /api/math/check, /api/math/solve
│   │   ├── teacher.js               # Teacher dashboard endpoints
│   │   ├── generate.js              # POST /api/generate/* -- AI content generation
│   │   ├── flashcards.js            # Flashcard CRUD and spaced repetition
│   │   ├── notes.js                 # Per-lesson note-taking
│   │   ├── bookmarks.js             # Lesson bookmarking
│   │   ├── search.js                # Full-text curriculum search
│   │   ├── system.js                # GET /api/system/status, POST /api/system/setup
│   │   ├── leaderboard.js           # GET /api/leaderboard
│   │   ├── daily-challenge.js       # GET /api/daily-challenge, POST /api/daily-challenge/submit
│   │   └── vocabulary.js            # GET /api/vocabulary
│   └── math-engine/
│       ├── index.js                 # Aggregates and exports all math modules
│       ├── arithmetic.js            # +, -, *, / with integers and decimals
│       ├── fractions.js             # Fraction operations, simplification, comparison
│       ├── algebra.js               # Linear equation solving, expression evaluation
│       ├── advanced-algebra.js      # Quadratics, systems of equations
│       ├── geometry.js              # Area, perimeter, volume for standard shapes
│       ├── statistics.js            # Mean, median, mode, range
│       ├── trigonometry.js          # Basic trig functions (grades 7-8)
│       ├── problem-generator.js     # Generates grade-appropriate problems
│       ├── answer-validator.js      # Validates student answers with equivalence
│       └── step-solver.js           # Deterministic step-by-step solutions
├── public/
│   ├── css/
│   │   └── styles.css               # All application styles
│   ├── js/
│   │   ├── app.js                   # SPA router and state management
│   │   ├── tutor.js                 # AI tutor chat interface
│   │   ├── lessons.js               # Lesson viewer
│   │   ├── quiz.js                  # Quiz engine
│   │   ├── progress.js              # Progress tracking and XP display
│   │   └── gamification.js          # Badges, streaks, leaderboard UI
│   ├── images/                      # SVG icons, badges, avatars
│   └── sounds/                      # Achievement sounds (small files)
├── templates/
│   └── index.html                   # Main SPA shell (loaded once)
├── content/
│   ├── curriculum_map.json          # Master index of all subjects and grades
│   ├── math/
│   │   ├── k.json                   # Kindergarten math
│   │   ├── 1.json through 8.json   # Grades 1-8 math
│   ├── science/
│   │   ├── k.json through 8.json
│   ├── ela/
│   │   ├── k.json through 8.json
│   └── social_studies/
│       ├── k.json through 8.json
├── prompts/
│   ├── tutor_math.txt               # System prompt for math tutoring
│   ├── tutor_science.txt            # System prompt for science tutoring
│   ├── tutor_ela.txt                # System prompt for ELA tutoring
│   ├── tutor_social.txt             # System prompt for social studies tutoring
│   ├── quiz_generator.txt           # System prompt for AI quiz generation
│   └── hint_generator.txt           # System prompt for generating hints
├── database/
│   ├── schema.sql                   # Full database schema
│   └── learnquest.db                # SQLite database (created at runtime)
├── scripts/
│   ├── setup.sh / setup.bat         # First-time setup
│   ├── start.sh / start.bat         # Start the application
│   └── stop.sh / stop.bat           # Stop the application
└── docs/
    ├── INSTALLATION.md
    ├── TEACHER_GUIDE.md
    ├── CONTRIBUTING.md
    └── ARCHITECTURE.md              # This file
```

---

## Server Entry Point

`server.js` is the main entry point. It:

1. Creates an Express application with compression, CORS, and JSON body parsing.
2. Serves static files from `public/`.
3. Implements session management using an in-memory `Map` with cookie-based session IDs.
4. Mounts all API route handlers.
5. Implements a setup redirect: if no users exist in the database, non-API GET requests redirect to `/setup`.
6. Provides an SPA fallback: any unmatched GET request serves `templates/index.html`.
7. Initializes the database and starts listening on port 5000 (configurable via `PORT` env var).

The server binds to `0.0.0.0` so it is accessible from other devices on the same network.

---

## API Endpoints

### Authentication

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Log in with name + PIN. Returns session cookie. |
| POST | `/api/auth/register` | Create a new student account (teacher-only). |

### Curriculum & Lessons

| Method | Path | Description |
|---|---|---|
| GET | `/api/curriculum` | Get the master curriculum map. |
| GET | `/api/curriculum/:subject/:grade` | Get all units for a subject and grade. |
| GET | `/api/lesson/:id` | Get a specific lesson by ID. |
| POST | `/api/lesson/:id/complete` | Mark a lesson complete and award XP. |

### AI Tutor

| Method | Path | Description |
|---|---|---|
| POST | `/api/tutor/chat` | Send a message to the AI tutor. Supports streaming via SSE. |
| POST | `/api/tutor/hint` | Get a hint for a specific problem. |

### Quizzes

| Method | Path | Description |
|---|---|---|
| GET | `/api/quiz/:unitId` | Get quiz questions for a unit. |
| POST | `/api/quiz/submit` | Submit quiz answers and get graded results. |
| POST | `/api/quiz/generate` | AI-generate a custom quiz for a topic. |

### Math Engine

| Method | Path | Description |
|---|---|---|
| POST | `/api/math/check` | Validate a student's math answer against the correct answer. |
| POST | `/api/math/solve` | Get a step-by-step solution for a math problem. |

### Progress & Gamification

| Method | Path | Description |
|---|---|---|
| GET | `/api/progress/:studentId` | Get a student's full progress data. |
| GET | `/api/progress/badges` | Get all available badges and which are earned. |
| GET | `/api/leaderboard` | Get the class leaderboard (sorted by XP). |
| GET | `/api/daily-challenge` | Get today's challenge problem. |
| POST | `/api/daily-challenge/submit` | Submit the daily challenge answer. |

### Teacher Dashboard

| Method | Path | Description |
|---|---|---|
| GET | `/api/teacher/students` | List all students. |
| GET | `/api/teacher/report/:studentId` | Get a detailed student report. |
| POST | `/api/teacher/export` | Export progress data as CSV. |
| GET | `/api/teacher/settings` | Get platform settings. |
| POST | `/api/teacher/settings` | Update platform settings. |

### Study Tools

| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/flashcards` | CRUD for flashcards with spaced repetition. |
| GET/POST | `/api/notes` | Per-lesson note-taking. |
| GET/POST | `/api/bookmarks` | Lesson bookmarking. |
| GET | `/api/search` | Full-text search across curriculum. |
| GET | `/api/vocabulary` | Vocabulary words for a subject and grade. |

### AI Content Generation

| Method | Path | Description |
|---|---|---|
| POST | `/api/generate/worksheet` | Generate a custom worksheet. |
| POST | `/api/generate/quiz` | Generate a custom quiz. |
| POST | `/api/generate/lesson` | Generate a custom lesson plan. |

### System

| Method | Path | Description |
|---|---|---|
| GET | `/api/system/status` | Check Ollama, model, and setup status. |
| POST | `/api/system/setup` | Complete first-time setup. |

---

## Database Schema

The database uses SQLite with the following tables. The schema is defined in `database/schema.sql` and executed on first run.

### Core Tables

**users** -- Students and teachers.
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    pin TEXT NOT NULL,
    role TEXT DEFAULT 'student',    -- 'student' or 'teacher'
    grade INTEGER DEFAULT 3,
    avatar TEXT DEFAULT 'owl',
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    streak_days INTEGER DEFAULT 0,
    last_active DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**lesson_progress** -- Tracks which lessons each student has completed.
```sql
CREATE TABLE lesson_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    lesson_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    grade INTEGER NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    score REAL,
    time_spent_seconds INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    completed_at DATETIME,
    UNIQUE(user_id, lesson_id)
);
```

**quiz_results** -- Every quiz attempt with detailed answer data.
```sql
CREATE TABLE quiz_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    quiz_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    grade INTEGER NOT NULL,
    score REAL NOT NULL,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL,
    time_spent_seconds INTEGER,
    answers_json TEXT,              -- JSON array of individual answers
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**badges** -- Badges earned by students.
```sql
CREATE TABLE badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    badge_id TEXT NOT NULL,
    badge_name TEXT NOT NULL,
    badge_description TEXT,
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, badge_id)
);
```

### Communication Tables

**chat_history** -- AI tutor conversation history.
```sql
CREATE TABLE chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    session_id TEXT NOT NULL,
    lesson_id TEXT,
    role TEXT NOT NULL,             -- 'user' or 'assistant'
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**conversations** -- Groups chat messages into named conversations.
```sql
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    session_id TEXT NOT NULL,
    title TEXT DEFAULT 'New Conversation',
    subject TEXT,
    pinned BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, session_id)
);
```

### Study Tool Tables

**flashcards** and **flashcard_progress** -- Flashcards with Leitner box spaced repetition.

**notes** -- Per-lesson student notes.

**bookmarks** -- Bookmarked lessons for quick access.

### System Tables

**settings** -- Key-value store for platform configuration.

**llm_cache** -- Cached LLM responses to reduce redundant model calls.

**generated_content** -- AI-generated worksheets, quizzes, and lessons.

**daily_challenges** -- Daily challenge problems and student submissions.

### Default Data

The schema inserts a default teacher account (`teacher` / `1234`) and default settings (leaderboard enabled, quiz timer disabled, gamification enabled).

---

## Math Engine

The math engine is the most critical component. It provides **deterministic, code-computed answers** for all math operations. The LLM is never used for computation -- only for explanation.

### Architecture

```
Student submits answer
        |
        v
+-------------------+
| answer-validator   |  Compares student answer to correct answer
| (answer-validator) |  using mathematical equivalence
+-------------------+
        |
        | If wrong, generate explanation
        v
+-------------------+     +------------------+
| step-solver       | --> | Ollama (LLM)     |
| (deterministic)   |     | Narrates steps   |
+-------------------+     +------------------+
```

### Modules

**arithmetic.js** -- Addition, subtraction, multiplication, division with integers and decimals. Handles order of operations.

**fractions.js** -- Full fraction arithmetic: add, subtract, multiply, divide. Simplification to lowest terms. Conversion between improper fractions and mixed numbers. Comparison.

**algebra.js** -- Solving linear equations (e.g., `2x + 3 = 7`). Evaluating expressions with variables. Simplifying expressions.

**advanced-algebra.js** -- Quadratic equations, systems of equations, polynomial operations.

**geometry.js** -- Area, perimeter, and volume calculations for: rectangles, triangles, circles, trapezoids, rectangular prisms, cylinders, cones, spheres. Pythagorean theorem.

**statistics.js** -- Mean, median, mode, range. Basic probability calculations.

**trigonometry.js** -- Sine, cosine, tangent for right triangles. Applicable to grades 7-8.

**problem-generator.js** -- Generates grade-appropriate math problems programmatically with known correct answers. Each problem includes metadata (difficulty, topic, operation type) and the computed answer.

**answer-validator.js** -- Checks if a student's answer is equivalent to the correct answer. Handles:
- Equivalent fractions: `1/2` = `2/4` = `3/6`
- Mixed numbers: `1 1/4` = `5/4`
- Decimal equivalence: `0.5` = `1/2`
- Tolerance for floating point: `3.14` approximately equals `3.141592...`
- Different formats: `12`, `12.0`, `12.00`

**step-solver.js** -- Produces deterministic step-by-step solutions for problems. Returns an array of steps, each with a description and intermediate result. The LLM then narrates these steps in student-friendly language.

### Example Flow

```
Student sees: "What is 3/4 + 1/2?"

1. problem-generator.js creates the problem with answer = 5/4 = "1 1/4"

2. Student answers: "4/6"

3. answer-validator.js:
   - Parses "4/6" as fraction 4/6
   - Parses correct answer "5/4" as fraction 5/4
   - Compares: 4/6 != 5/4 --> INCORRECT

4. step-solver.js generates steps:
   Step 1: Find common denominator of 4 and 2 --> LCD = 4
   Step 2: Convert 1/2 to 2/4
   Step 3: Add numerators: 3/4 + 2/4 = 5/4
   Step 4: Convert to mixed number: 5/4 = 1 1/4

5. LLM narrates: "Good try! Let's work through this together.
   When we add fractions, we need a common denominator first..."
```

---

## LLM Integration

### Ollama Client (`ollama-client.js`)

The Ollama client wraps HTTP calls to the local Ollama server (`http://localhost:11434`).

**Key features:**
- **Request queue:** Processes one LLM request at a time to prevent overloading the model.
- **Retry logic:** Retries failed requests up to 3 times with exponential backoff.
- **Streaming:** Supports Server-Sent Events (SSE) for real-time response streaming to the frontend.
- **Timeout:** 30-second timeout per request.
- **Health check:** Verifies Ollama is running before sending requests.
- **Auto-start:** Attempts to start Ollama if it is not running.

### Streaming Flow

```
Browser                    Express                    Ollama
  |                           |                          |
  |  POST /api/tutor/chat    |                          |
  |  Accept: text/event-stream|                          |
  |-------------------------->|                          |
  |                           | POST /api/chat           |
  |                           | stream: true             |
  |                           |------------------------->|
  |                           |                          |
  |  data: {"token":"Hi"}    |  {"message":{"content"..}}|
  |<--------------------------|<-------------------------|
  |  data: {"token":" there"}|  {"message":{"content"..}}|
  |<--------------------------|<-------------------------|
  |  data: [DONE]            |  {"done": true}          |
  |<--------------------------|<-------------------------|
```

### System Prompts

Each subject has a system prompt in `prompts/` that instructs the LLM to:
- Use the Socratic method (guide, do not tell).
- Adjust language to the student's grade level.
- Be encouraging and patient.
- Never perform computation (defer to the math engine).
- Keep responses concise (word limits vary by grade).

### Response Caching (`cache.js`)

Common LLM responses are cached in the `llm_cache` SQLite table. The cache key is generated from the system prompt + user message + grade level. This reduces redundant model calls when multiple students ask similar questions.

---

## Frontend Architecture

The frontend is a single-page application (SPA) built with vanilla JavaScript.

### Entry Point

`templates/index.html` is the SPA shell. It loads:
- `public/css/styles.css` -- All styles
- `public/js/app.js` -- Router and state management
- Other JS modules as needed

### Routing

Client-side routing is handled in `app.js` using the History API (`pushState` / `popstate`). Routes include:

- `/` -- Home screen (student dashboard)
- `/login` -- Login page
- `/setup` -- First-time setup wizard
- `/lessons/:subject/:grade` -- Subject unit listing
- `/lesson/:id` -- Individual lesson view
- `/quiz/:unitId` -- Quiz view
- `/progress` -- Student progress page
- `/teacher` -- Teacher dashboard
- `/flashcards` -- Flashcard study mode
- `/search` -- Curriculum search

### State Management

Application state is managed in a global state object in `app.js`:
- Current user (name, role, grade, XP, level)
- Current route and parameters
- Session data

### API Communication

All API calls use the browser's native `fetch()` API. No external HTTP libraries. Streaming responses (for the AI tutor) use the `EventSource` API or manual `ReadableStream` processing.

---

## Curriculum Content Format

Each grade-subject combination is a JSON file (e.g., `content/math/3.json`) with this structure:

```json
{
  "grade": 3,
  "subject": "math",
  "units": [
    {
      "id": "3-math-1",
      "title": "Multiplication & Division",
      "description": "Understanding multiplication as groups",
      "lessons": [
        {
          "id": "3-math-1-1",
          "title": "What is Multiplication?",
          "type": "lesson",
          "content": {
            "explanation": "Multiplication is a quick way to add equal groups...",
            "examples": [...],
            "key_vocabulary": ["multiply", "factors", "product"],
            "real_world": "If you have 3 bags with 4 apples each..."
          },
          "practice_problems": [...],
          "xp_reward": 20
        }
      ],
      "unit_quiz": {
        "questions": [...],
        "passing_score": 70,
        "xp_reward": 50,
        "badge": "multiplication_master"
      }
    }
  ]
}
```

The `curriculum_map.json` file provides a master index of all subjects, grades, and units.

---

## Caching Strategy

### LLM Response Cache

- Stored in the `llm_cache` SQLite table.
- Keyed by a hash of: system prompt + user message + grade level.
- Avoids redundant model calls for identical questions.
- No TTL -- cached responses persist until manually cleared.

### Static Asset Caching

- Express serves static files from `public/` with default caching headers.
- The `compression` middleware gzips responses for faster transfer.

---

## Session Management

Sessions are managed in-memory using a `Map` in `server.js`.

- On login, a random session ID is generated using `crypto.randomBytes()`.
- The session ID is set as a cookie (`learnquest_session`).
- Each request extracts the session cookie and resolves it against the in-memory store.
- Sessions persist until the server restarts (no persistent session storage).

This simple approach is appropriate because LearnQuest runs on a single machine. There is no need for Redis or other external session stores.

---

## Deployment Modes

### Personal Mode

Single user or family. No network access needed. Run on `localhost:5000`.

### Classroom Mode

One teacher computer serves all students. Students connect via the network. The server binds to `0.0.0.0:5000` to accept connections from any device on the same network.

### USB Mode

The entire application (including `node_modules/`) lives on a USB drive. Plug into any machine with Node.js and Ollama installed, and run `scripts/start.sh`.
