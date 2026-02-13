'use strict';

/**
 * Notes system routes - CRUD for student notes.
 * Prefix: /api/notes
 */

const router = require('express').Router();
const { getDb } = require('../database');

// -------------------------------------------------------------------------
// GET /  (list notes, optionally filtered by lesson_id)
// -------------------------------------------------------------------------
router.get('/', (req, res) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDb();
  const userId = req.session.user_id;
  const lessonId = req.query.lesson_id;

  let rows;
  if (lessonId) {
    rows = db
      .prepare(
        'SELECT * FROM notes WHERE user_id = ? AND lesson_id = ? ORDER BY updated_at DESC'
      )
      .all(userId, lessonId);
  } else {
    rows = db
      .prepare(
        'SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50'
      )
      .all(userId);
  }

  return res.json({ notes: rows });
});

// -------------------------------------------------------------------------
// POST /  (create note)
// -------------------------------------------------------------------------
router.post('/', (req, res) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const data = req.body || {};
  const content = (data.content || '').trim();
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(
    'INSERT INTO notes (user_id, lesson_id, lesson_title, subject, grade, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    req.session.user_id,
    data.lesson_id || null,
    data.lesson_title || null,
    data.subject || null,
    data.grade || null,
    content,
    now,
    now
  );

  return res.json({ message: 'Note saved' });
});

// -------------------------------------------------------------------------
// PUT /:noteId  (update note)
// -------------------------------------------------------------------------
router.put('/:noteId', (req, res) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const data = req.body || {};
  const content = (data.content || '').trim();
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  const db = getDb();
  const now = new Date().toISOString();
  const noteId = parseInt(req.params.noteId, 10);

  db.prepare(
    'UPDATE notes SET content = ?, updated_at = ? WHERE id = ? AND user_id = ?'
  ).run(content, now, noteId, req.session.user_id);

  return res.json({ message: 'Note updated' });
});

// -------------------------------------------------------------------------
// DELETE /:noteId
// -------------------------------------------------------------------------
router.delete('/:noteId', (req, res) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDb();
  const noteId = parseInt(req.params.noteId, 10);

  db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(
    noteId,
    req.session.user_id
  );

  return res.json({ message: 'Note deleted' });
});

module.exports = router;
