'use strict';

/**
 * Progress tracking, badges, vocabulary.
 * Prefix: /api/progress
 *
 * IMPORTANT: Literal routes (/badges, /vocabulary) MUST be defined before
 * the parameterized route (/:studentId) so Express matches them first.
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
// GET /badges  (must be before /:studentId)
// -------------------------------------------------------------------------
router.get('/badges', (req, res) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDb();
  const earned = db
    .prepare(
      'SELECT badge_id, badge_name, badge_description, earned_at FROM badges WHERE user_id = ?'
    )
    .all(req.session.user_id);

  return res.json({ earned });
});

// -------------------------------------------------------------------------
// GET /vocabulary  (must be before /:studentId)
// -------------------------------------------------------------------------
router.get('/vocabulary', (req, res) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDb();
  const userId = req.session.user_id;
  const user = db.prepare('SELECT grade FROM users WHERE id = ?').get(userId);
  const grade = user ? user.grade : 3;
  const subjectFilter = req.query.subject;

  // Get completed lesson IDs
  const completed = db
    .prepare(
      'SELECT lesson_id, subject FROM lesson_progress WHERE user_id = ? AND completed = 1'
    )
    .all(userId);

  const gradeStr = grade === 0 ? 'k' : String(grade);
  const words = [];

  const subjectList = subjectFilter
    ? [subjectFilter]
    : ['math', 'science', 'ela', 'social_studies'];
  const completedIds = new Set(completed.map((row) => row.lesson_id));

  for (const subject of subjectList) {
    const filepath = path.join(CONTENT_DIR, subject, `${gradeStr}.json`);
    if (!fs.existsSync(filepath)) continue;

    let data;
    try {
      data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    } catch (_e) {
      continue;
    }

    for (const unit of data.units || []) {
      for (const lesson of unit.lessons || []) {
        if (!completedIds.has(lesson.id)) continue;
        const vocab = (lesson.content || {}).key_vocabulary || [];
        for (const word of vocab) {
          words.push({
            word,
            subject,
            lesson_id: lesson.id || '',
            lesson_title: lesson.title || '',
          });
        }
      }
    }
  }

  // Deduplicate
  const seen = new Set();
  const uniqueWords = [];
  for (const w of words) {
    const lower = w.word.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      uniqueWords.push(w);
    }
  }

  return res.json({ words: uniqueWords });
});

// -------------------------------------------------------------------------
// GET /:studentId  (parameterized -- must come after literal routes)
// -------------------------------------------------------------------------
router.get('/:studentId', (req, res) => {
  const studentId = parseInt(req.params.studentId, 10);

  if (isNaN(studentId)) {
    return res.status(400).json({ error: 'Invalid student ID' });
  }

  const db = getDb();

  const subjects = {};
  for (const subject of ['math', 'science', 'ela', 'social_studies']) {
    const row = db
      .prepare(
        `SELECT COUNT(*) as completed, AVG(score) as avg_score
         FROM lesson_progress
         WHERE user_id = ? AND subject = ? AND completed = 1`
      )
      .get(studentId, subject);

    // Count total lessons available
    const user = db
      .prepare('SELECT grade FROM users WHERE id = ?')
      .get(studentId);
    const grade = user ? user.grade : 3;
    const gradeStr = grade === 0 ? 'k' : String(grade);
    const filepath = path.join(CONTENT_DIR, subject, `${gradeStr}.json`);

    let total = 0;
    if (fs.existsSync(filepath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
        for (const unit of data.units || []) {
          total += (unit.lessons || []).length;
        }
      } catch (_e) {
        // Skip
      }
    }

    subjects[subject] = {
      completed: row ? row.completed : 0,
      total: Math.max(total, 1),
      avg_score: row ? row.avg_score : null,
    };
  }

  const totalLessons = db
    .prepare(
      'SELECT COUNT(*) as cnt FROM lesson_progress WHERE user_id = ? AND completed = 1'
    )
    .get(studentId);

  const totalQuizzes = db
    .prepare(
      'SELECT COUNT(*) as cnt FROM quiz_results WHERE user_id = ? AND score >= 70'
    )
    .get(studentId);

  return res.json({
    subjects,
    total_lessons: totalLessons ? totalLessons.cnt : 0,
    total_quizzes: totalQuizzes ? totalQuizzes.cnt : 0,
  });
});

module.exports = router;
