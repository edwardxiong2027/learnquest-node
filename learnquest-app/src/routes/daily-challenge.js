'use strict';

/**
 * Daily challenge convenience route handlers.
 * Mounted as:
 *   app.get('/api/daily-challenge', handler.get)
 *   app.post('/api/daily-challenge/submit', handler.submit)
 */

const path = require('path');
const fs = require('fs');
const { getDb } = require('../database');

const CONTENT_DIR =
  process.env.LEARNQUEST_CONTENT ||
  path.join(__dirname, '..', '..', 'content');

// -------------------------------------------------------------------------
// GET /api/daily-challenge
// -------------------------------------------------------------------------
function getDailyChallenge(req, res) {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDb();
  const userId = req.session.user_id;
  const today = new Date().toISOString().split('T')[0];

  // Check if already completed
  const existing = db
    .prepare(
      'SELECT * FROM daily_challenges WHERE user_id = ? AND challenge_date = ?'
    )
    .get(userId, today);

  if (existing && existing.completed_at) {
    return res.json({ completed: true, correct: Boolean(existing.correct) });
  }

  if (existing) {
    let question;
    try {
      question = JSON.parse(existing.question_json);
    } catch (_e) {
      question = {};
    }
    return res.json({
      completed: false,
      subject: existing.subject,
      question,
    });
  }

  // Generate a new challenge
  const user = db.prepare('SELECT grade FROM users WHERE id = ?').get(userId);
  const grade = user ? user.grade : 3;

  const challenge = _generateDailyChallenge(grade);
  if (!challenge) {
    return res.status(404).json({ error: 'No challenge available' });
  }

  db.prepare(
    'INSERT INTO daily_challenges (user_id, challenge_date, subject, question_json) VALUES (?, ?, ?, ?)'
  ).run(userId, today, challenge.subject, JSON.stringify(challenge.question));

  return res.json({
    completed: false,
    subject: challenge.subject,
    question: challenge.question,
  });
}

// -------------------------------------------------------------------------
// POST /api/daily-challenge/submit
// -------------------------------------------------------------------------
function submitDailyChallenge(req, res) {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDb();
  const userId = req.session.user_id;
  const today = new Date().toISOString().split('T')[0];
  const data = req.body || {};
  const answer = data.answer;

  const challenge = db
    .prepare(
      'SELECT * FROM daily_challenges WHERE user_id = ? AND challenge_date = ?'
    )
    .get(userId, today);

  if (!challenge) {
    return res.status(404).json({ error: 'No challenge found' });
  }

  if (challenge.completed_at) {
    return res.status(400).json({ error: 'Already completed' });
  }

  let question;
  try {
    question = JSON.parse(challenge.question_json);
  } catch (_e) {
    question = {};
  }

  // Check answer
  let correct = false;
  let correctAnswer = null;

  if (question.type === 'multiple_choice') {
    correct = answer === question.correct;
    correctAnswer =
      question.options && question.correct !== undefined
        ? question.options[question.correct]
        : '';
  } else {
    correctAnswer = String(question.answer || '');
    correct =
      String(answer || '')
        .trim()
        .toLowerCase() === correctAnswer.toLowerCase();
  }

  const xpAward = correct ? 15 : 0;

  db.prepare(
    'UPDATE daily_challenges SET answer = ?, correct = ?, completed_at = ? WHERE user_id = ? AND challenge_date = ?'
  ).run(
    String(answer),
    correct ? 1 : 0,
    new Date().toISOString(),
    userId,
    today
  );

  if (xpAward > 0) {
    db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(
      xpAward,
      userId
    );

    const { calculateLevel } = require('./curriculum');
    const user = db.prepare('SELECT xp FROM users WHERE id = ?').get(userId);
    db.prepare('UPDATE users SET level = ? WHERE id = ?').run(
      calculateLevel(user.xp),
      userId
    );

    // Daily challenge badge
    const { _awardBadge } = require('./quiz');
    _awardBadge(
      db,
      userId,
      'daily_challenger',
      'Challenge Accepted',
      'Complete a daily challenge'
    );
  }

  return res.json({
    correct,
    correct_answer: correctAnswer,
    xp_awarded: xpAward,
  });
}

// -------------------------------------------------------------------------
// Helper: generate a random daily challenge question from curriculum
// -------------------------------------------------------------------------
function _generateDailyChallenge(grade) {
  const subjects = ['math', 'science', 'ela', 'social_studies'];

  // Shuffle subjects
  for (let i = subjects.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [subjects[i], subjects[j]] = [subjects[j], subjects[i]];
  }

  for (const subject of subjects) {
    const gradeStr = grade === 0 ? 'k' : String(grade);
    const filepath = path.join(CONTENT_DIR, subject, `${gradeStr}.json`);

    if (!fs.existsSync(filepath)) continue;

    let data;
    try {
      data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    } catch (_e) {
      continue;
    }

    // Collect all practice problems
    const problems = [];
    for (const unit of data.units || []) {
      for (const lesson of unit.lessons || []) {
        for (const prob of lesson.practice_problems || []) {
          problems.push(prob);
        }
      }
    }

    if (problems.length === 0) continue;

    const question = problems[Math.floor(Math.random() * problems.length)];
    return { subject, question };
  }

  return null;
}

module.exports = {
  get: getDailyChallenge,
  submit: submitDailyChallenge,
};
