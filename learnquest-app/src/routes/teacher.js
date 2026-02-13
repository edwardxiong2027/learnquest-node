'use strict';

/**
 * Teacher dashboard routes - student management, reports, settings, export.
 * Prefix: /api/teacher
 */

const router = require('express').Router();
const os = require('os');
const { getDb } = require('../database');

// -------------------------------------------------------------------------
// Middleware: require teacher role
// -------------------------------------------------------------------------

function requireTeacher(req, res, next) {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDb();
  const user = db
    .prepare('SELECT role FROM users WHERE id = ?')
    .get(req.session.user_id);

  if (!user || user.role !== 'teacher') {
    return res.status(403).json({ error: 'Teacher access required' });
  }

  next();
}

// -------------------------------------------------------------------------
// GET /students
// -------------------------------------------------------------------------
router.get('/students', requireTeacher, (_req, res) => {
  const db = getDb();
  const students = db
    .prepare(
      'SELECT id, name, grade, xp, level, streak_days, last_active, created_at FROM users WHERE role = ? ORDER BY name'
    )
    .all('student');

  return res.json({ students });
});

// -------------------------------------------------------------------------
// GET /report/:studentId
// -------------------------------------------------------------------------
router.get('/report/:studentId', requireTeacher, (req, res) => {
  const studentId = parseInt(req.params.studentId, 10);
  const db = getDb();

  const student = db
    .prepare('SELECT * FROM users WHERE id = ? AND role = ?')
    .get(studentId, 'student');

  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  // Subject progress
  const progress = [];
  for (const subject of ['math', 'science', 'ela', 'social_studies']) {
    const row = db
      .prepare(
        `SELECT COUNT(*) as completed, AVG(score) as avg_score
         FROM lesson_progress WHERE user_id = ? AND subject = ? AND completed = 1`
      )
      .get(studentId, subject);

    progress.push({
      subject,
      completed: row.completed,
      avg_score: row.avg_score,
    });
  }

  // Recent quizzes
  const quizzes = db
    .prepare(
      `SELECT quiz_id, subject, score, total_questions, correct_answers, completed_at
       FROM quiz_results WHERE user_id = ? ORDER BY completed_at DESC LIMIT 20`
    )
    .all(studentId);

  // Badges
  const badges = db
    .prepare(
      'SELECT badge_id, badge_name, badge_description, earned_at FROM badges WHERE user_id = ?'
    )
    .all(studentId);

  return res.json({
    student,
    progress,
    quizzes,
    badges,
  });
});

// -------------------------------------------------------------------------
// PUT /student/:studentId
// -------------------------------------------------------------------------
router.put('/student/:studentId', requireTeacher, (req, res) => {
  const studentId = parseInt(req.params.studentId, 10);
  const db = getDb();

  const student = db
    .prepare('SELECT * FROM users WHERE id = ? AND role = ?')
    .get(studentId, 'student');

  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  const data = req.body || {};
  const name = data.name !== undefined ? data.name : student.name;
  const grade = data.grade !== undefined ? data.grade : student.grade;
  const avatar = data.avatar !== undefined ? data.avatar : student.avatar;

  if (data.pin) {
    db.prepare(
      'UPDATE users SET name = ?, pin = ?, grade = ?, avatar = ? WHERE id = ?'
    ).run(name, String(data.pin), grade, avatar, studentId);
  } else {
    db.prepare(
      'UPDATE users SET name = ?, grade = ?, avatar = ? WHERE id = ?'
    ).run(name, grade, avatar, studentId);
  }

  return res.json({ message: 'Student updated' });
});

// -------------------------------------------------------------------------
// DELETE /student/:studentId
// -------------------------------------------------------------------------
router.delete('/student/:studentId', requireTeacher, (req, res) => {
  const studentId = parseInt(req.params.studentId, 10);
  const db = getDb();

  const student = db
    .prepare('SELECT * FROM users WHERE id = ? AND role = ?')
    .get(studentId, 'student');

  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  // Cascade delete all related data
  db.prepare('DELETE FROM lesson_progress WHERE user_id = ?').run(studentId);
  db.prepare('DELETE FROM quiz_results WHERE user_id = ?').run(studentId);
  db.prepare('DELETE FROM badges WHERE user_id = ?').run(studentId);
  db.prepare('DELETE FROM chat_history WHERE user_id = ?').run(studentId);
  db.prepare('DELETE FROM daily_challenges WHERE user_id = ?').run(studentId);
  db.prepare('DELETE FROM generated_content WHERE user_id = ?').run(studentId);
  db.prepare('DELETE FROM flashcard_progress WHERE user_id = ?').run(studentId);
  db.prepare('DELETE FROM flashcards WHERE user_id = ?').run(studentId);
  db.prepare('DELETE FROM notes WHERE user_id = ?').run(studentId);
  db.prepare('DELETE FROM bookmarks WHERE user_id = ?').run(studentId);
  db.prepare('DELETE FROM users WHERE id = ?').run(studentId);

  return res.json({ message: 'Student deleted' });
});

// -------------------------------------------------------------------------
// GET /network-info
// -------------------------------------------------------------------------
router.get('/network-info', requireTeacher, (_req, res) => {
  let ip = '127.0.0.1';

  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          ip = iface.address;
          break;
        }
      }
      if (ip !== '127.0.0.1') break;
    }
  } catch (_e) {
    // Use default
  }

  const port = parseInt(process.env.LEARNQUEST_PORT || process.env.PORT || '5001', 10);
  const url = `http://${ip}:${port}`;

  return res.json({ ip, port, url });
});

// -------------------------------------------------------------------------
// GET /settings
// -------------------------------------------------------------------------
router.get('/settings', requireTeacher, (_req, res) => {
  const db = getDb();
  const settings = db.prepare('SELECT key, value FROM settings').all();

  const result = {};
  for (const s of settings) {
    result[s.key] = s.value;
  }

  return res.json(result);
});

// -------------------------------------------------------------------------
// POST /settings
// -------------------------------------------------------------------------
router.post('/settings', requireTeacher, (req, res) => {
  const data = req.body || {};
  const db = getDb();

  for (const [key, value] of Object.entries(data)) {
    db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?'
    ).run(key, String(value), String(value));
  }

  return res.json({ message: 'Settings updated' });
});

// -------------------------------------------------------------------------
// POST /export
// -------------------------------------------------------------------------
router.post('/export', requireTeacher, (_req, res) => {
  const db = getDb();
  const students = db
    .prepare(
      'SELECT id, name, grade, xp, level, streak_days FROM users WHERE role = ? ORDER BY name'
    )
    .all('student');

  const rows = [];
  rows.push(
    [
      'Name',
      'Grade',
      'XP',
      'Level',
      'Streak',
      'Math Lessons',
      'Science Lessons',
      'ELA Lessons',
      'Social Studies Lessons',
      'Quizzes Passed',
    ].join(',')
  );

  for (const student of students) {
    const cols = [
      `"${student.name}"`,
      student.grade,
      student.xp,
      student.level,
      student.streak_days,
    ];

    for (const subject of ['math', 'science', 'ela', 'social_studies']) {
      const cnt = db
        .prepare(
          'SELECT COUNT(*) as cnt FROM lesson_progress WHERE user_id = ? AND subject = ? AND completed = 1'
        )
        .get(student.id, subject);
      cols.push(cnt.cnt);
    }

    const quizCnt = db
      .prepare(
        'SELECT COUNT(*) as cnt FROM quiz_results WHERE user_id = ? AND score >= 70'
      )
      .get(student.id);
    cols.push(quizCnt.cnt);

    rows.push(cols.join(','));
  }

  const csv = rows.join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename=learnquest_progress.csv'
  );
  return res.send(csv);
});

// -------------------------------------------------------------------------
// GET /leaderboard
// -------------------------------------------------------------------------
router.get('/leaderboard', (_req, res) => {
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
});

module.exports = router;
