'use strict';

/**
 * AI Tutor routes - chat, hints, conversation management via Ollama.
 * Prefix: /api/tutor
 */

const router = require('express').Router();
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../database');
const ollama = require('../ollama-client');
const { makeCacheKey, getCachedResponse, cacheResponse } = require('../cache');

// -------------------------------------------------------------------------
// Prompt loading
// -------------------------------------------------------------------------

const PROMPTS_DIR =
  process.env.LEARNQUEST_PROMPTS ||
  path.join(__dirname, '..', '..', 'prompts');

/**
 * Load a system prompt template and fill in variables.
 */
function loadPrompt(promptFile, vars) {
  const filepath = path.join(PROMPTS_DIR, promptFile);
  if (!fs.existsSync(filepath)) {
    return 'You are a friendly and helpful tutor for K-12 students.';
  }
  let template = fs.readFileSync(filepath, 'utf-8');
  if (vars) {
    for (const [key, value] of Object.entries(vars)) {
      template = template.split(`{${key}}`).join(String(value));
    }
  }
  return template;
}

// -------------------------------------------------------------------------
// POST /chat  (streaming SSE)
// -------------------------------------------------------------------------
router.post('/chat', async (req, res) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const data = req.body || {};
  const message = (data.message || '').trim();
  const sessionId = data.session_id || 'default';
  const lessonId = data.lesson_id || null;
  const subject = data.subject || 'math';
  const grade = data.grade !== undefined ? data.grade : 3;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const db = getDb();
  const userId = req.session.user_id;

  // Auto-create conversation if it doesn't exist
  const existingConv = db
    .prepare(
      'SELECT id FROM conversations WHERE user_id = ? AND session_id = ?'
    )
    .get(userId, sessionId);

  if (!existingConv) {
    const title =
      message.length > 50 ? message.slice(0, 50) + '...' : message;
    db.prepare(
      'INSERT INTO conversations (user_id, session_id, title, subject) VALUES (?, ?, ?, ?)'
    ).run(userId, sessionId, title, subject);
  }

  // Save user message
  db.prepare(
    'INSERT INTO chat_history (user_id, session_id, lesson_id, role, message) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, sessionId, lessonId, 'user', message);

  // Update conversation timestamp
  db.prepare(
    'UPDATE conversations SET updated_at = ? WHERE user_id = ? AND session_id = ?'
  ).run(new Date().toISOString(), userId, sessionId);

  // Award tutor badge on first use
  const { _awardBadge } = require('./quiz');
  _awardBadge(db, userId, 'tutor_user', 'Help Seeker', 'Use the AI tutor');

  // Build prompt
  const promptMap = {
    math: 'tutor_math.txt',
    science: 'tutor_science.txt',
    ela: 'tutor_ela.txt',
    social_studies: 'tutor_social.txt',
  };

  const systemPrompt = loadPrompt(
    promptMap[subject] || 'tutor_math.txt',
    { grade, topic: subject, lesson_title: lessonId || 'General' }
  );

  // Get recent chat history
  const history = db
    .prepare(
      'SELECT role, message FROM chat_history WHERE user_id = ? AND session_id = ? ORDER BY created_at DESC LIMIT 10'
    )
    .all(userId, sessionId)
    .reverse();

  const messages = [{ role: 'system', content: systemPrompt }];
  for (const h of history) {
    messages.push({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.message,
    });
  }

  // Check cache
  const cacheKey = crypto
    .createHash('md5')
    .update(JSON.stringify(messages.slice(-3)))
    .digest('hex');

  const cached = getCachedResponse(cacheKey);
  if (cached) {
    db.prepare(
      'INSERT INTO chat_history (user_id, session_id, lesson_id, role, message) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, sessionId, lessonId, 'assistant', cached);
    return res.json({ response: cached });
  }

  // Try streaming response
  try {
    const rawRes = await ollama.chat(messages, {
      stream: true,
      temperature: 0.7,
      maxTokens: 500,
    });

    if (rawRes && rawRes.body) {
      // Set up SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      let fullResponse = '';
      const reader = rawRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            try {
              const parsed = JSON.parse(trimmed);
              const token =
                parsed.message && parsed.message.content
                  ? parsed.message.content
                  : '';

              if (token) {
                fullResponse += token;
                res.write(
                  `data: ${JSON.stringify({ token })}\n\n`
                );
              }

              if (parsed.done) {
                res.write('data: [DONE]\n\n');

                // Save assistant message and cache
                try {
                  db.prepare(
                    'INSERT INTO chat_history (user_id, session_id, lesson_id, role, message) VALUES (?, ?, ?, ?, ?)'
                  ).run(
                    userId,
                    sessionId,
                    lessonId,
                    'assistant',
                    fullResponse
                  );
                  cacheResponse(cacheKey, fullResponse);
                } catch (_e) {
                  // Non-fatal
                }

                res.end();
                return;
              }
            } catch (_parseErr) {
              // Skip malformed JSON lines
            }
          }
        }
      } catch (_streamErr) {
        // Stream read error -- fall through
      }

      // If streaming ended without a done signal, still save what we have
      if (fullResponse) {
        try {
          db.prepare(
            'INSERT INTO chat_history (user_id, session_id, lesson_id, role, message) VALUES (?, ?, ?, ?, ?)'
          ).run(userId, sessionId, lessonId, 'assistant', fullResponse);
          cacheResponse(cacheKey, fullResponse);
        } catch (_e) {
          // Non-fatal
        }
        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }
    }
  } catch (_streamErr) {
    // Fall through to non-streaming
  }

  // Fallback: non-streaming
  try {
    const response = await ollama.chat(messages, {
      stream: false,
      temperature: 0.7,
      maxTokens: 500,
    });

    db.prepare(
      'INSERT INTO chat_history (user_id, session_id, lesson_id, role, message) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, sessionId, lessonId, 'assistant', response);
    cacheResponse(cacheKey, response);

    return res.json({ response });
  } catch (err) {
    return res.json({
      response:
        "I'm having trouble thinking right now. Try again in a moment!",
    });
  }
});

// -------------------------------------------------------------------------
// POST /hint
// -------------------------------------------------------------------------
router.post('/hint', async (req, res) => {
  const data = req.body || {};
  const problem = data.problem || '';
  const subject = data.subject || 'math';
  const grade = data.grade !== undefined ? data.grade : 3;

  if (!problem) {
    return res.json({ hint: 'Try breaking the problem into smaller steps!' });
  }

  const systemPrompt = loadPrompt('hint_generator.txt', { grade, subject });
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Give me a hint for this problem: ${problem}` },
  ];

  const cacheKey = crypto
    .createHash('md5')
    .update(`hint:${problem}:${grade}`)
    .digest('hex');

  const cached = getCachedResponse(cacheKey);
  if (cached) {
    return res.json({ hint: cached });
  }

  try {
    const response = await ollama.chat(messages, {
      stream: false,
      temperature: 0.7,
      maxTokens: 500,
    });
    cacheResponse(cacheKey, response);
    return res.json({ hint: response });
  } catch (_err) {
    return res.json({ hint: 'Try breaking the problem into smaller steps!' });
  }
});

// -------------------------------------------------------------------------
// GET /conversations
// -------------------------------------------------------------------------
router.get('/conversations', (req, res) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDb();
  const userId = req.session.user_id;

  const rows = db
    .prepare(
      `SELECT c.id, c.session_id, c.title, c.subject, c.pinned, c.created_at, c.updated_at,
              (SELECT COUNT(*) FROM chat_history ch WHERE ch.user_id = c.user_id AND ch.session_id = c.session_id) as message_count
       FROM conversations c
       WHERE c.user_id = ?
       ORDER BY c.pinned DESC, c.updated_at DESC`
    )
    .all(userId);

  return res.json({ conversations: rows });
});

// -------------------------------------------------------------------------
// POST /conversations
// -------------------------------------------------------------------------
router.post('/conversations', (req, res) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const data = req.body || {};
  const subject = data.subject || 'math';
  const sessionId = `session_${Date.now()}`;

  const db = getDb();
  const userId = req.session.user_id;

  db.prepare(
    'INSERT INTO conversations (user_id, session_id, title, subject) VALUES (?, ?, ?, ?)'
  ).run(userId, sessionId, 'New Conversation', subject);

  const conv = db
    .prepare(
      'SELECT * FROM conversations WHERE user_id = ? AND session_id = ?'
    )
    .get(userId, sessionId);

  return res.json({ conversation: conv });
});

// -------------------------------------------------------------------------
// PUT /conversations/:convId
// -------------------------------------------------------------------------
router.put('/conversations/:convId', (req, res) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const data = req.body || {};
  const title = (data.title || '').trim();
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const db = getDb();
  db.prepare(
    'UPDATE conversations SET title = ? WHERE id = ? AND user_id = ?'
  ).run(title, parseInt(req.params.convId, 10), req.session.user_id);

  return res.json({ message: 'Updated' });
});

// -------------------------------------------------------------------------
// DELETE /conversations/:convId
// -------------------------------------------------------------------------
router.delete('/conversations/:convId', (req, res) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDb();
  const userId = req.session.user_id;
  const convId = parseInt(req.params.convId, 10);

  const conv = db
    .prepare('SELECT session_id FROM conversations WHERE id = ? AND user_id = ?')
    .get(convId, userId);

  if (conv) {
    db.prepare(
      'DELETE FROM chat_history WHERE user_id = ? AND session_id = ?'
    ).run(userId, conv.session_id);
    db.prepare(
      'DELETE FROM conversations WHERE id = ? AND user_id = ?'
    ).run(convId, userId);
  }

  return res.json({ message: 'Deleted' });
});

// -------------------------------------------------------------------------
// POST /conversations/:convId/pin
// -------------------------------------------------------------------------
router.post('/conversations/:convId/pin', (req, res) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDb();
  const userId = req.session.user_id;
  const convId = parseInt(req.params.convId, 10);

  const conv = db
    .prepare('SELECT pinned FROM conversations WHERE id = ? AND user_id = ?')
    .get(convId, userId);

  if (!conv) {
    return res.status(404).json({ error: 'Not found' });
  }

  const newPinned = conv.pinned ? 0 : 1;
  db.prepare(
    'UPDATE conversations SET pinned = ? WHERE id = ? AND user_id = ?'
  ).run(newPinned, convId, userId);

  return res.json({ pinned: Boolean(newPinned) });
});

// -------------------------------------------------------------------------
// GET /conversations/:convId/messages
// -------------------------------------------------------------------------
router.get('/conversations/:convId/messages', (req, res) => {
  if (!req.session || !req.session.user_id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDb();
  const userId = req.session.user_id;
  const convId = parseInt(req.params.convId, 10);

  const conv = db
    .prepare(
      'SELECT session_id, subject FROM conversations WHERE id = ? AND user_id = ?'
    )
    .get(convId, userId);

  if (!conv) {
    return res.status(404).json({ error: 'Not found' });
  }

  const messages = db
    .prepare(
      'SELECT role, message, created_at FROM chat_history WHERE user_id = ? AND session_id = ? ORDER BY created_at ASC'
    )
    .all(userId, conv.session_id);

  return res.json({
    messages,
    session_id: conv.session_id,
    subject: conv.subject,
  });
});

module.exports = router;
