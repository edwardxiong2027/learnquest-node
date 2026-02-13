'use strict';

/**
 * Authentication routes - login, register, session management.
 * Prefix: /api/auth
 */

const router = require('express').Router();
const crypto = require('crypto');
const { getDb } = require('../database');

// Import the sessions Map from server.js.  We require it lazily inside
// helpers to avoid circular-dependency issues at module load time.
function getSessions() {
  return require('../../server').sessions;
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/**
 * Set a session cookie for the given user.
 * Creates an entry in the in-memory session store and writes a
 * Set-Cookie header on the response.
 */
function setSession(res, userId) {
  const sessionId = crypto.randomUUID();
  const sessions = getSessions();
  sessions.set(sessionId, { user_id: userId, created_at: Date.now() });

  res.setHeader(
    'Set-Cookie',
    `learnquest_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax`
  );
  return sessionId;
}

/**
 * Clear the current session cookie and remove it from the store.
 */
function clearSession(req, res) {
  const sessions = getSessions();
  if (req.sessionId) {
    sessions.delete(req.sessionId);
  }
  res.setHeader(
    'Set-Cookie',
    'learnquest_session=; Path=/; HttpOnly; Max-Age=0'
  );
}

// -------------------------------------------------------------------------
// POST /login
// -------------------------------------------------------------------------
router.post('/login', (req, res) => {
  const { name, pin } = req.body || {};
  const trimmedName = (name || '').trim();

  if (!trimmedName || !pin) {
    return res.status(400).json({ error: 'Name and PIN are required' });
  }

  const db = getDb();
  const user = db
    .prepare('SELECT * FROM users WHERE name = ? AND pin = ?')
    .get(trimmedName, String(pin));

  if (!user) {
    return res.status(401).json({ error: 'Invalid name or PIN' });
  }

  // Update streak
  const today = new Date().toISOString().split('T')[0];
  const lastActive = user.last_active;
  let streak = user.streak_days;

  if (lastActive) {
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split('T')[0];
    if (lastActive === yesterday) {
      streak += 1;
    } else if (lastActive !== today) {
      streak = 1;
    }
  } else {
    streak = 1;
  }

  db.prepare('UPDATE users SET last_active = ?, streak_days = ? WHERE id = ?')
    .run(today, streak, user.id);

  // Set session
  setSession(res, user.id);

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      grade: user.grade,
      avatar: user.avatar,
      xp: user.xp,
      level: user.level,
      streak_days: streak,
    },
  });
});

// -------------------------------------------------------------------------
// POST /register
// -------------------------------------------------------------------------
router.post('/register', (req, res) => {
  // Only teachers can register students
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDb();
  const teacher = db
    .prepare('SELECT role FROM users WHERE id = ?')
    .get(req.session.user_id);

  if (!teacher || teacher.role !== 'teacher') {
    return res.status(403).json({ error: 'Only teachers can register students' });
  }

  const data = req.body || {};
  const name = (data.name || '').trim();
  const pin = data.pin || '';
  const grade = data.grade !== undefined ? data.grade : 3;

  if (!name || !pin) {
    return res.status(400).json({ error: 'Name and PIN are required' });
  }

  // Check if name already exists
  const existing = db.prepare('SELECT id FROM users WHERE name = ?').get(name);
  if (existing) {
    return res.status(400).json({ error: 'A user with that name already exists' });
  }

  db.prepare(
    'INSERT INTO users (name, pin, role, grade) VALUES (?, ?, ?, ?)'
  ).run(name, String(pin), 'student', grade);

  return res.json({ message: 'Student created successfully' });
});

// -------------------------------------------------------------------------
// GET /session
// -------------------------------------------------------------------------
router.get('/session', (req, res) => {
  if (!req.session || !req.session.user_id) {
    return res.json({ user: null });
  }

  const db = getDb();
  const user = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(req.session.user_id);

  if (!user) {
    clearSession(req, res);
    return res.json({ user: null });
  }

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      grade: user.grade,
      avatar: user.avatar,
      xp: user.xp,
      level: user.level,
      streak_days: user.streak_days,
    },
  });
});

// -------------------------------------------------------------------------
// POST /logout
// -------------------------------------------------------------------------
router.post('/logout', (req, res) => {
  clearSession(req, res);
  return res.json({ message: 'Logged out' });
});

module.exports = router;
