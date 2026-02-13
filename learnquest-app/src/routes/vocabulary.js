'use strict';

/**
 * Vocabulary convenience route handler.
 * Mounted as: app.get('/api/vocabulary', handler)
 *
 * This is a standalone handler (not a Router), so we export a single
 * function that matches the (req, res) signature.
 */

const path = require('path');
const fs = require('fs');
const { getDb } = require('../database');

const CONTENT_DIR =
  process.env.LEARNQUEST_CONTENT ||
  path.join(__dirname, '..', '..', 'content');

module.exports = function getVocabulary(req, res) {
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
};
