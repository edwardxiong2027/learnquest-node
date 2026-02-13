'use strict';

/**
 * Search across all curriculum content.
 * Mounted at /api so the path is /api/search.
 * Also includes /api/worksheet/:lessonId for printable worksheets.
 */

const router = require('express').Router();
const path = require('path');
const fs = require('fs');

// -------------------------------------------------------------------------
// Content directory
// -------------------------------------------------------------------------
const CONTENT_DIR =
  process.env.LEARNQUEST_CONTENT ||
  path.join(__dirname, '..', '..', 'content');

// -------------------------------------------------------------------------
// In-memory search index, built on first call
// -------------------------------------------------------------------------
let _searchIndex = null;

function _buildIndex() {
  const index = [];

  for (const subject of ['math', 'science', 'ela', 'social_studies']) {
    const subjectDir = path.join(CONTENT_DIR, subject);
    if (!fs.existsSync(subjectDir) || !fs.statSync(subjectDir).isDirectory()) {
      continue;
    }

    let files;
    try {
      files = fs.readdirSync(subjectDir);
    } catch (_e) {
      continue;
    }

    for (const filename of files) {
      if (!filename.endsWith('.json')) continue;

      const gradeStr = filename.replace('.json', '');
      let grade;
      if (gradeStr === 'k') {
        grade = 0;
      } else if (/^\d+$/.test(gradeStr)) {
        grade = parseInt(gradeStr, 10);
      } else {
        continue;
      }

      const filepath = path.join(subjectDir, filename);
      let data;
      try {
        data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      } catch (_e) {
        continue;
      }

      for (const unit of data.units || []) {
        for (const lesson of unit.lessons || []) {
          const content = lesson.content || {};
          const searchable = [
            lesson.title || '',
            unit.title || '',
            content.explanation || '',
            (content.key_vocabulary || []).join(' '),
            content.real_world || '',
          ]
            .join(' ')
            .toLowerCase();

          index.push({
            lesson_id: lesson.id || '',
            title: lesson.title || '',
            unit_title: unit.title || '',
            subject,
            grade,
            searchable,
          });
        }
      }
    }
  }

  _searchIndex = index;
  return index;
}

// -------------------------------------------------------------------------
// GET /search
// -------------------------------------------------------------------------
router.get('/search', (req, res) => {
  const query = (req.query.q || '').trim().toLowerCase();
  if (query.length < 2) {
    return res.json({ results: [] });
  }

  if (_searchIndex === null) {
    _buildIndex();
  }

  const results = [];
  const terms = query.split(/\s+/);

  for (const item of _searchIndex) {
    // All terms must appear in searchable text
    if (terms.every((term) => item.searchable.includes(term))) {
      // Build context snippet
      const text = item.searchable;
      const pos = text.indexOf(terms[0]);
      const start = Math.max(0, pos - 30);
      const end = Math.min(text.length, pos + 60);
      let context = text.slice(start, end).trim();
      if (start > 0) context = '...' + context;
      if (end < text.length) context = context + '...';

      results.push({
        lesson_id: item.lesson_id,
        title: item.title,
        unit_title: item.unit_title,
        subject: item.subject,
        grade: item.grade,
        context,
      });
    }
  }

  // Sort: exact title matches first
  results.sort((a, b) => {
    const aMatch = a.title.toLowerCase().includes(query) ? 0 : 1;
    const bMatch = b.title.toLowerCase().includes(query) ? 0 : 1;
    return aMatch - bMatch;
  });

  return res.json({ results: results.slice(0, 20) });
});

// -------------------------------------------------------------------------
// GET /worksheet/:lessonId  (generate printable HTML worksheet)
// -------------------------------------------------------------------------
router.get('/worksheet/:lessonId', (req, res) => {
  const { lessonId } = req.params;
  const subject = req.query.subject || 'math';
  const grade = req.query.grade || '3';

  const gradeStr = grade === '0' ? 'k' : grade;
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

  // Find the lesson
  let lesson = null;
  for (const unit of data.units || []) {
    for (const l of unit.lessons || []) {
      if (l.id === lessonId) {
        lesson = l;
        break;
      }
    }
    if (lesson) break;
  }

  if (!lesson) {
    return res.status(404).json({ error: 'Lesson not found' });
  }

  const problems = lesson.practice_problems || [];
  const gradeLabel = grade === '0' ? 'Kindergarten' : `Grade ${grade}`;
  const subjectNames = {
    math: 'Math',
    science: 'Science',
    ela: 'ELA',
    social_studies: 'Social Studies',
  };

  // Build printable HTML
  let html = `<!DOCTYPE html>
<html><head>
<title>${_esc(lesson.title || '')} - Worksheet</title>
<style>
body { font-family: -apple-system, Arial, sans-serif; max-width: 700px; margin: 2rem auto; padding: 0 1rem; color: #333; }
h1 { font-size: 1.4rem; border-bottom: 2px solid #333; padding-bottom: 0.5rem; }
.meta { color: #666; font-size: 0.9rem; margin-bottom: 1rem; }
.problem { margin: 1.5rem 0; padding: 0.75rem 0; border-bottom: 1px solid #ddd; }
.problem-num { font-weight: bold; }
.options { margin: 0.5rem 0 0 1.5rem; }
.options div { margin: 0.25rem 0; }
.answer-line { border-bottom: 1px solid #999; width: 200px; display: inline-block; margin-left: 0.5rem; }
.answer-key { page-break-before: always; }
.answer-key h2 { border-bottom: 2px solid #333; padding-bottom: 0.25rem; }
.answer { margin: 0.5rem 0; }
.name-line { border-bottom: 1px solid #333; width: 250px; display: inline-block; }
@media print { body { margin: 1rem; } }
</style>
</head><body>

<h1>${_esc(lesson.title || '')}</h1>
<div class="meta">${subjectNames[subject] || subject} | ${gradeLabel} | LearnQuest Worksheet</div>
<p>Name: <span class="name-line"></span> &nbsp; Date: <span class="name-line" style="width:150px"></span></p>

<hr>
`;

  for (let i = 0; i < problems.length; i++) {
    const prob = problems[i];
    html += `<div class="problem"><span class="problem-num">${i + 1}.</span> ${_esc(prob.question || '')}`;

    if (prob.type === 'multiple_choice' && prob.options) {
      html += '<div class="options">';
      for (let j = 0; j < prob.options.length; j++) {
        const letter = String.fromCharCode(65 + j);
        html += `<div>${letter}. ${_esc(String(prob.options[j]))}</div>`;
      }
      html += '</div>';
    } else if (prob.type === 'true_false') {
      html +=
        '<div class="options"><div>T. True</div><div>F. False</div></div>';
    } else {
      html += '<br>Answer: <span class="answer-line"></span>';
    }

    html += '</div>';
  }

  // Answer key on a new page
  html += '<div class="answer-key worksheet-answer-key"><h2>Answer Key</h2>';
  for (let i = 0; i < problems.length; i++) {
    const prob = problems[i];
    if (prob.type === 'multiple_choice' && prob.options) {
      const correctIdx = prob.correct || 0;
      const answer =
        correctIdx < prob.options.length ? prob.options[correctIdx] : '?';
      const letter = String.fromCharCode(65 + correctIdx);
      html += `<div class="answer"><strong>${i + 1}.</strong> ${letter}. ${_esc(String(answer))}</div>`;
    } else if (prob.type === 'true_false') {
      html += `<div class="answer"><strong>${i + 1}.</strong> ${_esc(String(prob.answer || ''))}</div>`;
    } else {
      html += `<div class="answer"><strong>${i + 1}.</strong> ${_esc(String(prob.answer || ''))}</div>`;
    }
  }
  html += '</div></body></html>';

  res.setHeader('Content-Type', 'text/html');
  return res.send(html);
});

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function _esc(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = router;
