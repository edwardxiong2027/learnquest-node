'use strict';

/**
 * Leaderboard convenience route handler.
 * Mounted as: app.get('/api/leaderboard', handler)
 *
 * This is a standalone handler (not a Router), so we export a single
 * function that matches the (req, res) signature.
 */

const { getDb } = require('../database');

module.exports = function getLeaderboard(_req, res) {
  const db = getDb();
  const setting = db
    .prepare("SELECT value FROM settings WHERE key = 'leaderboard_enabled'")
    .get();

  if (setting && setting.value !== 'true') {
    return res.json({ leaderboard: [], disabled: true });
  }

  const students = db
    .prepare(
      'SELECT id, name, xp, level, streak_days FROM users WHERE role = ? ORDER BY xp DESC LIMIT 50'
    )
    .all('student');

  return res.json({ leaderboard: students });
};
