'use strict';

/**
 * Flashcard system routes with Leitner spaced repetition.
 * Prefix: /api/flashcards
 */

const router = require('express').Router();
const { getDb } = require('../database');

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/**
 * Calculate next review date based on Leitner box number.
 * Box 1: 1 day, Box 2: 2 days, Box 3: 4 days, Box 4: 8 days, Box 5: 16 days
 */
function _nextReviewDate(box) {
  const days = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 };
  const delta = days[box] || 1;
  const date = new Date();
  date.setDate(date.getDate() + delta);
  return date.toISOString().split('T')[0];
}

// -------------------------------------------------------------------------
// GET /  (list flashcards with progress)
// -------------------------------------------------------------------------
router.get('/', (req, res) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDb();
  const userId = req.session.user_id;
  const subject = req.query.subject;
  const grade = req.query.grade;

  let query =
    'SELECT f.*, fp.box, fp.next_review, fp.times_correct, fp.times_wrong FROM flashcards f LEFT JOIN flashcard_progress fp ON f.id = fp.flashcard_id AND fp.user_id = ? WHERE f.user_id = ?';
  const params = [userId, userId];

  if (subject) {
    query += ' AND f.subject = ?';
    params.push(subject);
  }
  if (grade) {
    query += ' AND f.grade = ?';
    params.push(parseInt(grade, 10));
  }

  query += ' ORDER BY f.created_at DESC';
  const rows = db.prepare(query).all(...params);

  return res.json({ flashcards: rows });
});

// -------------------------------------------------------------------------
// POST /  (create flashcard)
// -------------------------------------------------------------------------
router.post('/', (req, res) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const data = req.body || {};
  const db = getDb();
  const userId = req.session.user_id;

  const front = (data.front || '').trim();
  const back = (data.back || '').trim();
  if (!front || !back) {
    return res.status(400).json({ error: 'Front and back are required' });
  }

  db.prepare(
    'INSERT INTO flashcards (user_id, subject, grade, topic, front, back, hint, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(
    userId,
    data.subject || '',
    data.grade || null,
    data.topic || '',
    front,
    back,
    data.hint || '',
    'manual'
  );

  return res.json({ message: 'Flashcard created' });
});

// -------------------------------------------------------------------------
// GET /study  (get cards due for review - Leitner boxes)
// -------------------------------------------------------------------------
router.get('/study', (req, res) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDb();
  const userId = req.session.user_id;
  const today = new Date().toISOString().split('T')[0];
  const subject = req.query.subject;

  let query = `
    SELECT f.*, COALESCE(fp.box, 1) as box
    FROM flashcards f
    LEFT JOIN flashcard_progress fp ON f.id = fp.flashcard_id AND fp.user_id = ?
    WHERE f.user_id = ?
    AND (fp.next_review IS NULL OR fp.next_review <= ?)
  `;
  const params = [userId, userId, today];

  if (subject) {
    query += ' AND f.subject = ?';
    params.push(subject);
  }

  query += ' ORDER BY COALESCE(fp.box, 1) ASC, f.created_at ASC LIMIT 20';
  const rows = db.prepare(query).all(...params);

  return res.json({ cards: rows });
});

// -------------------------------------------------------------------------
// POST /review  (record review result, advance/reset box)
// -------------------------------------------------------------------------
router.post('/review', (req, res) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const data = req.body || {};
  const db = getDb();
  const userId = req.session.user_id;
  const flashcardId = data.flashcard_id;
  const correct = Boolean(data.correct);

  if (!flashcardId) {
    return res.status(400).json({ error: 'flashcard_id required' });
  }

  const now = new Date().toISOString();

  // Get current progress
  const existing = db
    .prepare(
      'SELECT * FROM flashcard_progress WHERE user_id = ? AND flashcard_id = ?'
    )
    .get(userId, flashcardId);

  if (existing) {
    const box = existing.box;
    if (correct) {
      const newBox = Math.min(box + 1, 5);
      db.prepare(
        'UPDATE flashcard_progress SET box = ?, next_review = ?, last_reviewed = ?, times_correct = times_correct + 1 WHERE user_id = ? AND flashcard_id = ?'
      ).run(newBox, _nextReviewDate(newBox), now, userId, flashcardId);
    } else {
      db.prepare(
        'UPDATE flashcard_progress SET box = 1, next_review = ?, last_reviewed = ?, times_wrong = times_wrong + 1 WHERE user_id = ? AND flashcard_id = ?'
      ).run(_nextReviewDate(1), now, userId, flashcardId);
    }
  } else {
    const newBox = correct ? 2 : 1;
    db.prepare(
      'INSERT INTO flashcard_progress (user_id, flashcard_id, box, next_review, last_reviewed, times_correct, times_wrong) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      userId,
      flashcardId,
      newBox,
      _nextReviewDate(newBox),
      now,
      correct ? 1 : 0,
      correct ? 0 : 1
    );
  }

  return res.json({ message: 'Review recorded', correct });
});

// -------------------------------------------------------------------------
// DELETE /:cardId
// -------------------------------------------------------------------------
router.delete('/:cardId', (req, res) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const cardId = parseInt(req.params.cardId, 10);
  const db = getDb();
  const userId = req.session.user_id;

  db.prepare(
    'DELETE FROM flashcard_progress WHERE flashcard_id = ? AND user_id = ?'
  ).run(cardId, userId);
  db.prepare('DELETE FROM flashcards WHERE id = ? AND user_id = ?').run(
    cardId,
    userId
  );

  return res.json({ message: 'Deleted' });
});

module.exports = router;
