'use strict';

const express = require('express');
const path = require('path');
const compression = require('compression');
const cors = require('cors');
const crypto = require('crypto');
const { initDatabase, getDb } = require('./src/database');

// ---------------------------------------------------------------------------
// Session store -- a plain in-memory Map keyed by session ID.
// Each value is an object with at least { user_id, created_at }.
// Exported so route modules can look up / mutate sessions.
// ---------------------------------------------------------------------------
const sessions = new Map();

// ---------------------------------------------------------------------------
// Express app setup
// ---------------------------------------------------------------------------
const app = express();

app.use(compression());
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Serve static assets from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// Session middleware
// Reads the 'learnquest_session' cookie, resolves it against the in-memory
// store, and attaches req.session (with at least user_id) when valid.
// ---------------------------------------------------------------------------
app.use((req, _res, next) => {
  req.session = null;

  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return next();

  // Parse the specific cookie we care about without pulling in a library.
  const prefix = 'learnquest_session=';
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      const sessionId = trimmed.slice(prefix.length);
      const sessionData = sessions.get(sessionId);
      if (sessionData) {
        req.session = sessionData;
        req.sessionId = sessionId;
      }
      break;
    }
  }

  next();
});

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
// Auth routes (login / register)
app.use('/api/auth', require('./src/routes/auth'));

// Curriculum & lessons
app.use('/api', require('./src/routes/curriculum'));

// Quiz
app.use('/api/quiz', require('./src/routes/quiz'));

// Progress & gamification
app.use('/api/progress', require('./src/routes/progress'));

// Teacher dashboard
app.use('/api/teacher', require('./src/routes/teacher'));

// AI tutor chat & hints
app.use('/api/tutor', require('./src/routes/tutor'));

// Math engine (check / solve)
app.use('/api/math', require('./src/routes/math'));

// AI content generation (AI Studio)
app.use('/api/generate', require('./src/routes/generate'));

// Flashcards
app.use('/api/flashcards', require('./src/routes/flashcards'));

// Notes
app.use('/api/notes', require('./src/routes/notes'));

// Bookmarks
app.use('/api/bookmarks', require('./src/routes/bookmarks'));

// Search & worksheets (mounted at /api so paths like /api/search work)
app.use('/api', require('./src/routes/search'));

// System status & first-run setup wizard
app.use('/api/system', require('./src/routes/system'));

// ---------------------------------------------------------------------------
// Top-level convenience routes
// ---------------------------------------------------------------------------
app.get('/api/leaderboard', require('./src/routes/leaderboard'));
app.get('/api/daily-challenge', require('./src/routes/daily-challenge').get);
app.post('/api/daily-challenge/submit', require('./src/routes/daily-challenge').submit);
app.get('/api/vocabulary', require('./src/routes/vocabulary'));

// ---------------------------------------------------------------------------
// Setup redirect middleware
// If no users exist in the DB and the request is a non-API, non-static GET,
// redirect to /setup so the first-run wizard is shown.
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.startsWith('/css/') && !req.path.startsWith('/js/') && !req.path.startsWith('/images/') && req.path !== '/setup') {
    try {
      const db = getDb();
      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
      if (userCount.count === 0) {
        return res.redirect('/setup');
      }
    } catch (e) {
      // DB not ready yet, continue
    }
  }
  next();
});

// ---------------------------------------------------------------------------
// SPA fallback -- serve templates/index.html for any non-API GET request
// that did not match a static file.
// ---------------------------------------------------------------------------
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
const PORT = parseInt(process.env.PORT, 10) || 5000;
const HOST = '0.0.0.0';

function start() {
  // Initialise the database (runs schema.sql, sets pragmas)
  initDatabase();
  console.log('[LearnQuest] Database initialised.');

  app.listen(PORT, HOST, () => {
    console.log(`[LearnQuest] Server running at http://${HOST}:${PORT}`);
    console.log(`[LearnQuest] Open http://localhost:${PORT} in your browser.`);
  });
}

// Only start the server when this file is executed directly (not required as a module)
if (require.main === module) {
  start();
}

// ---------------------------------------------------------------------------
// Exports for use by route modules
// ---------------------------------------------------------------------------
module.exports = { app, sessions, start };
