'use strict';

/**
 * Curriculum & lesson routes.
 * Mounted at /api so paths are /api/curriculum, /api/lesson/:id, etc.
 */

const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const { getDb } = require('../database');

// -------------------------------------------------------------------------
// Content directory
// -------------------------------------------------------------------------
const CONTENT_DIR =
  process.env.LEARNQUEST_CONTENT ||
  path.join(__dirname, '..', '..', 'content');

// -------------------------------------------------------------------------
// Level thresholds
// -------------------------------------------------------------------------
const LEVEL_THRESHOLDS = [
  0, 50, 120, 200, 300, 420, 560, 720, 900, 1100,
  1320, 1560, 1820, 2100, 2400, 2720, 3060, 3420, 3800, 4200,
  4620, 5060, 5520, 6000, 6500, 7020, 7560, 8120, 8700, 9300,
  9920, 10560, 11220, 11900, 12600, 13320, 14060, 14820, 15600, 16400,
  17220, 18060, 18920, 19800, 20700, 21620, 22560, 23520, 24500, 25000,
];

/**
 * Calculate level from XP.
 * @param {number} xp
 * @returns {number} level (1-based)
 */
function calculateLevel(xp) {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    }
  }
  return level;
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/**
 * Load a grade's curriculum JSON file.
 * @param {string} subject
 * @param {number} grade - 0 for kindergarten, 1-8 otherwise
 * @returns {object|null}
 */
function loadCurriculumFile(subject, grade) {
  const gradeStr = grade === 0 ? 'k' : String(grade);
  const filepath = path.join(CONTENT_DIR, subject, `${gradeStr}.json`);
  if (!fs.existsSync(filepath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch (_e) {
    return null;
  }
}

// -------------------------------------------------------------------------
// GET /curriculum
// -------------------------------------------------------------------------
router.get('/curriculum', (_req, res) => {
  const filepath = path.join(CONTENT_DIR, 'curriculum_map.json');
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Curriculum map not found' });
  }
  try {
    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    return res.json(data);
  } catch (_e) {
    return res.status(500).json({ error: 'Failed to read curriculum map' });
  }
});

// -------------------------------------------------------------------------
// GET /curriculum/:subject/:grade
// -------------------------------------------------------------------------
router.get('/curriculum/:subject/:grade', (req, res) => {
  const { subject } = req.params;
  const grade = parseInt(req.params.grade, 10);

  const data = loadCurriculumFile(subject, grade);
  if (!data) {
    return res
      .status(404)
      .json({ error: `Content not found for ${subject} grade ${grade}` });
  }

  // Attach completion status if user is logged in
  if (req.session && req.session.user_id) {
    const db = getDb();
    const completed = db
      .prepare(
        'SELECT lesson_id FROM lesson_progress WHERE user_id = ? AND completed = 1'
      )
      .all(req.session.user_id);

    const completedIds = new Set(completed.map((row) => row.lesson_id));

    for (const unit of data.units || []) {
      for (const lesson of unit.lessons || []) {
        lesson.completed = completedIds.has(lesson.id);
      }
    }
  }

  return res.json(data);
});

// -------------------------------------------------------------------------
// GET /lesson/:lessonId
// -------------------------------------------------------------------------
router.get('/lesson/:lessonId', (req, res) => {
  const { lessonId } = req.params;
  const subject = req.query.subject;
  const grade = req.query.grade !== undefined ? parseInt(req.query.grade, 10) : null;

  if (!subject || grade === null || isNaN(grade)) {
    return res
      .status(400)
      .json({ error: 'subject and grade parameters required' });
  }

  const data = loadCurriculumFile(subject, grade);
  if (!data) {
    return res.status(404).json({ error: 'Content not found' });
  }

  // Find the lesson
  for (const unit of data.units || []) {
    for (const lesson of unit.lessons || []) {
      if (lesson.id === lessonId) {
        return res.json(lesson);
      }
    }
  }

  return res.status(404).json({ error: 'Lesson not found' });
});

// -------------------------------------------------------------------------
// POST /lesson/:lessonId/complete
// -------------------------------------------------------------------------
router.post('/lesson/:lessonId/complete', (req, res) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const { lessonId } = req.params;
  const data = req.body || {};
  const subject = data.subject;
  const grade = data.grade;
  const score = data.score !== undefined ? data.score : 0;

  const db = getDb();
  const userId = req.session.user_id;
  const now = new Date().toISOString();

  // Upsert lesson progress
  const existing = db
    .prepare(
      'SELECT id, completed FROM lesson_progress WHERE user_id = ? AND lesson_id = ?'
    )
    .get(userId, lessonId);

  if (existing && existing.completed) {
    return res.json({ message: 'Already completed', xp_awarded: 0 });
  }

  if (existing) {
    db.prepare(
      'UPDATE lesson_progress SET completed = 1, score = ?, completed_at = ?, attempts = attempts + 1 WHERE id = ?'
    ).run(score, now, existing.id);
  } else {
    db.prepare(
      'INSERT INTO lesson_progress (user_id, lesson_id, subject, grade, completed, score, attempts, completed_at) VALUES (?, ?, ?, ?, 1, ?, 1, ?)'
    ).run(userId, lessonId, subject, grade, score, now);
  }

  // Award XP if passing score
  let xpAward = 0;
  if (score >= 70) {
    xpAward = 20;
    if (score === 100) {
      xpAward += 10; // bonus for perfect
    }
    db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(
      xpAward,
      userId
    );

    // Update level
    const user = db.prepare('SELECT xp FROM users WHERE id = ?').get(userId);
    const newLevel = calculateLevel(user.xp);
    db.prepare('UPDATE users SET level = ? WHERE id = ?').run(newLevel, userId);
  }

  return res.json({ message: 'Lesson completed', xp_awarded: xpAward });
});

// -------------------------------------------------------------------------
// Exports
// -------------------------------------------------------------------------
module.exports = router;
module.exports.calculateLevel = calculateLevel;
module.exports.loadCurriculumFile = loadCurriculumFile;
module.exports.CONTENT_DIR = CONTENT_DIR;
