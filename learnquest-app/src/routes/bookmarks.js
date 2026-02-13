'use strict';

/**
 * Bookmark system routes.
 * Prefix: /api/bookmarks
 */

const router = require('express').Router();
const { getDb } = require('../database');

// -------------------------------------------------------------------------
// GET /  (list bookmarks)
// -------------------------------------------------------------------------
router.get('/', (req, res) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDb();
  const rows = db
    .prepare(
      'SELECT * FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC'
    )
    .all(req.session.user_id);

  return res.json({ bookmarks: rows });
});

// -------------------------------------------------------------------------
// POST /toggle  (toggle bookmark on/off)
// -------------------------------------------------------------------------
router.post('/toggle', (req, res) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const data = req.body || {};
  const lessonId = data.lesson_id;
  if (!lessonId) {
    return res.status(400).json({ error: 'lesson_id required' });
  }

  const db = getDb();
  const userId = req.session.user_id;

  const existing = db
    .prepare('SELECT id FROM bookmarks WHERE user_id = ? AND lesson_id = ?')
    .get(userId, lessonId);

  if (existing) {
    db.prepare('DELETE FROM bookmarks WHERE id = ?').run(existing.id);
    return res.json({ bookmarked: false });
  } else {
    db.prepare(
      'INSERT INTO bookmarks (user_id, lesson_id, lesson_title, subject, grade) VALUES (?, ?, ?, ?, ?)'
    ).run(
      userId,
      lessonId,
      data.lesson_title || '',
      data.subject || '',
      data.grade || null
    );
    return res.json({ bookmarked: true });
  }
});

// -------------------------------------------------------------------------
// GET /check/:lessonId  (check if bookmarked)
// -------------------------------------------------------------------------
router.get('/check/:lessonId', (req, res) => {
  if (!req.session || !req.session.user_id) {
    return res.json({ bookmarked: false });
  }

  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM bookmarks WHERE user_id = ? AND lesson_id = ?')
    .get(req.session.user_id, req.params.lessonId);

  return res.json({ bookmarked: Boolean(existing) });
});

module.exports = router;
