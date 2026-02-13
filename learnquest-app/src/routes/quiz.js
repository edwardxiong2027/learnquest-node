'use strict';

/**
 * Quiz routes - serving quizzes, submitting answers, scoring.
 * Prefix: /api/quiz
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
// Helpers
// -------------------------------------------------------------------------

/**
 * Award a badge if the user hasn't already earned it.
 * Exported so other routes (e.g. tutor, progress) can reuse it.
 */
function _awardBadge(db, userId, badgeId, badgeName, badgeDesc) {
  const existing = db
    .prepare('SELECT id FROM badges WHERE user_id = ? AND badge_id = ?')
    .get(userId, badgeId);

  if (!existing) {
    db.prepare(
      'INSERT INTO badges (user_id, badge_id, badge_name, badge_description) VALUES (?, ?, ?, ?)'
    ).run(userId, badgeId, badgeName, badgeDesc);
  }
}

// -------------------------------------------------------------------------
// GET /:unitId
// -------------------------------------------------------------------------
router.get('/:unitId', (req, res) => {
  const { unitId } = req.params;
  const subject = req.query.subject;
  const grade =
    req.query.grade !== undefined ? parseInt(req.query.grade, 10) : null;

  if (!subject || grade === null || isNaN(grade)) {
    return res
      .status(400)
      .json({ error: 'subject and grade parameters required' });
  }

  const gradeStr = grade === 0 ? 'k' : String(grade);
  const filepath = path.join(CONTENT_DIR, subject, `${gradeStr}.json`);

  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Content not found' });
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch (_e) {
    return res.status(500).json({ error: 'Failed to read content' });
  }

  // Find the unit
  for (const unit of data.units || []) {
    if (unit.id === unitId) {
      const quiz = unit.unit_quiz || {};
      return res.json({
        unit_id: unitId,
        title: `${unit.title} Quiz`,
        questions: quiz.questions || [],
        passing_score: quiz.passing_score || 70,
        xp_reward: quiz.xp_reward || 50,
        badge: quiz.badge || null,
      });
    }
  }

  return res.status(404).json({ error: 'Unit not found' });
});

// -------------------------------------------------------------------------
// POST /submit
// -------------------------------------------------------------------------
router.post('/submit', (req, res) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const data = req.body || {};
  const quizId = data.quiz_id;
  const subject = data.subject;
  const grade = data.grade;
  const score = data.score !== undefined ? data.score : 0;
  const totalQuestions = data.total_questions || 0;
  const correctAnswers = data.correct_answers || 0;
  const timeSpent = data.time_spent_seconds || 0;
  const answers = data.answers || [];

  const db = getDb();
  const userId = req.session.user_id;

  // Record quiz result
  db.prepare(
    `INSERT INTO quiz_results
     (user_id, quiz_id, subject, grade, score, total_questions, correct_answers, time_spent_seconds, answers_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    userId,
    quizId,
    subject,
    grade,
    score,
    totalQuestions,
    correctAnswers,
    timeSpent,
    JSON.stringify(answers)
  );

  let xpAward = 0;
  const badgesEarned = [];
  const passingScore = 70;

  if (score >= passingScore) {
    xpAward = 50;
    if (score === 100) {
      xpAward += 25;
      // Perfect score badge
      _awardBadge(
        db,
        userId,
        'perfect_score',
        'Perfect Score',
        'Get 100% on a quiz'
      );
      badgesEarned.push('perfect_score');
    }

    // Speed badge
    if (timeSpent > 0 && timeSpent < 120 && totalQuestions >= 5) {
      _awardBadge(
        db,
        userId,
        'speed_demon',
        'Speed Demon',
        'Complete a quiz in under 2 minutes'
      );
      badgesEarned.push('speed_demon');
    }

    // First quiz badge
    const quizCount = db
      .prepare(
        'SELECT COUNT(*) as cnt FROM quiz_results WHERE user_id = ? AND score >= 70'
      )
      .get(userId);

    if (quizCount.cnt <= 1) {
      _awardBadge(
        db,
        userId,
        'first_quiz',
        'Quiz Taker',
        'Complete your first quiz'
      );
      badgesEarned.push('first_quiz');
    }

    db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(
      xpAward,
      userId
    );

    // Update level
    const { calculateLevel } = require('./curriculum');
    const user = db.prepare('SELECT xp FROM users WHERE id = ?').get(userId);
    const newLevel = calculateLevel(user.xp);
    db.prepare('UPDATE users SET level = ? WHERE id = ?').run(newLevel, userId);
  }

  return res.json({
    message: 'Quiz submitted',
    score,
    passed: score >= passingScore,
    xp_awarded: xpAward,
    badges_earned: badgesEarned,
  });
});

// -------------------------------------------------------------------------
// POST /generate (placeholder)
// -------------------------------------------------------------------------
router.post('/generate', (_req, res) => {
  return res
    .status(503)
    .json({ error: 'Quiz generation requires AI tutor to be running' });
});

// -------------------------------------------------------------------------
// Exports
// -------------------------------------------------------------------------
module.exports = router;
module.exports._awardBadge = _awardBadge;
