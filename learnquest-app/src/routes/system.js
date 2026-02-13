'use strict';

/**
 * System routes - first-run setup wizard, status checks, Ollama management.
 * Prefix: /api/system
 */

const router = require('express').Router();
const { getDb } = require('../database');

// -------------------------------------------------------------------------
// GET /status
// Returns the current system status: Ollama running, model downloaded,
// whether initial setup (teacher account creation) has been completed,
// and the application version.
// -------------------------------------------------------------------------
router.get('/status', async (_req, res) => {
  let ollamaRunning = false;
  let modelDownloaded = false;
  let setupComplete = false;

  // Check if Ollama is running
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const response = await fetch('http://localhost:11434/', {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    ollamaRunning = response.ok;
  } catch (_e) {
    ollamaRunning = false;
  }

  // Check if the phi3 model is downloaded
  if (ollamaRunning) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const response = await fetch('http://localhost:11434/api/tags', {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        const models = data.models || [];
        modelDownloaded = models.some(
          (m) => m.name && m.name.toLowerCase().includes('phi3')
        );
      }
    } catch (_e) {
      modelDownloaded = false;
    }
  }

  // Check if setup is complete (any users exist in the DB)
  try {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) as count FROM users').get();
    setupComplete = row.count > 0;
  } catch (_e) {
    setupComplete = false;
  }

  return res.json({
    ollamaRunning,
    modelDownloaded,
    setupComplete,
    version: '1.0.0',
  });
});

// -------------------------------------------------------------------------
// POST /setup
// Creates the initial teacher account during first-run setup.
// Only works if no users exist yet in the database.
// -------------------------------------------------------------------------
router.post('/setup', (req, res) => {
  const { name, pin } = req.body || {};
  const trimmedName = (name || '').trim();

  if (!trimmedName || !pin) {
    return res
      .status(400)
      .json({ error: 'Name and PIN are required' });
  }

  const db = getDb();

  // Only allow setup if no users exist yet (first run)
  const row = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (row.count > 0) {
    return res
      .status(400)
      .json({ error: 'Setup has already been completed' });
  }

  db.prepare(
    'INSERT INTO users (name, pin, role, grade) VALUES (?, ?, ?, ?)'
  ).run(trimmedName, String(pin), 'teacher', 0);

  return res.json({ success: true, message: 'Setup complete!' });
});

// -------------------------------------------------------------------------
// GET /ollama-install
// SSE endpoint that attempts to start Ollama and streams status updates
// back to the client.
// -------------------------------------------------------------------------
router.get('/ollama-install', (_req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  /**
   * Send an SSE event to the client.
   */
  function sendEvent(data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  /**
   * Check if Ollama is reachable at http://localhost:11434/
   */
  async function checkOllama() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const response = await fetch('http://localhost:11434/', {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return response.ok;
    } catch (_e) {
      return false;
    }
  }

  (async () => {
    try {
      sendEvent({ status: 'checking', message: 'Checking if Ollama is running...' });

      let running = await checkOllama();

      if (running) {
        sendEvent({ status: 'running', message: 'Ollama is already running.' });
      } else {
        sendEvent({ status: 'starting', message: 'Ollama is not running. Attempting to start...' });

        // Try to start Ollama serve in the background
        const { exec } = require('child_process');
        exec('ollama serve', (error) => {
          if (error) {
            // Ollama serve may exit if another instance takes over; this is not
            // necessarily a fatal error so we just log it.
            console.log('[system] ollama serve process exited:', error.message);
          }
        });

        // Poll for Ollama to become available (up to 15 seconds)
        const maxAttempts = 15;
        for (let i = 0; i < maxAttempts; i++) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          running = await checkOllama();
          if (running) {
            sendEvent({ status: 'running', message: 'Ollama started successfully.' });
            break;
          }
          sendEvent({
            status: 'waiting',
            message: `Waiting for Ollama to start... (${i + 1}/${maxAttempts})`,
          });
        }

        if (!running) {
          sendEvent({
            status: 'error',
            message:
              'Could not start Ollama. Please install it from https://ollama.com and try again.',
          });
          sendEvent({ status: 'done' });
          res.end();
          return;
        }
      }

      // Check if phi3 model is available
      sendEvent({ status: 'checking_model', message: 'Checking for phi3 model...' });

      let modelReady = false;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const tagsResponse = await fetch('http://localhost:11434/api/tags', {
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (tagsResponse.ok) {
          const tagsData = await tagsResponse.json();
          const models = tagsData.models || [];
          modelReady = models.some(
            (m) => m.name && m.name.toLowerCase().includes('phi3')
          );
        }
      } catch (_e) {
        modelReady = false;
      }

      if (modelReady) {
        sendEvent({ status: 'model_ready', message: 'phi3 model is available.' });
      } else {
        sendEvent({
          status: 'model_missing',
          message:
            'phi3 model not found. Run "ollama pull phi3" to download it.',
        });
      }

      sendEvent({ status: 'done' });
    } catch (err) {
      sendEvent({
        status: 'error',
        message: 'An unexpected error occurred: ' + err.message,
      });
      sendEvent({ status: 'done' });
    }

    res.end();
  })();

  // Handle client disconnect
  _req.on('close', () => {
    res.end();
  });
});

module.exports = router;
