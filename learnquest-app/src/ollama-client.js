'use strict';

const { spawn } = require('child_process');
const path = require('path');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const OLLAMA_BASE = process.env.OLLAMA_HOST || 'http://localhost:11434';
const MODEL = process.env.LEARNQUEST_MODEL || 'llama3.2:3b';
const REQUEST_TIMEOUT_MS = 120_000; // 2 minutes
const MAX_RETRIES = 3;
const RETRY_BACKOFF_MS = 1_000;

// ---------------------------------------------------------------------------
// Request queue -- processes one LLM request at a time so the local model
// is never overloaded with concurrent generation requests.
// ---------------------------------------------------------------------------

const queue = [];
let processing = false;

/**
 * Push a task onto the queue and start draining if not already running.
 * Each task is an async function that returns a value.  The returned promise
 * resolves with that value once the task reaches the front and completes.
 */
function enqueue(taskFn) {
  return new Promise((resolve, reject) => {
    queue.push({ taskFn, resolve, reject });
    drainQueue();
  });
}

async function drainQueue() {
  if (processing) return;
  processing = true;

  while (queue.length > 0) {
    const { taskFn, resolve, reject } = queue.shift();
    try {
      const result = await taskFn();
      resolve(result);
    } catch (err) {
      reject(err);
    }
  }

  processing = false;
}

// ---------------------------------------------------------------------------
// Low-level fetch helpers
// ---------------------------------------------------------------------------

/**
 * Perform a fetch with a timeout via AbortController.
 * Returns the raw Response object.
 */
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Retry wrapper.  Calls `fn` up to `MAX_RETRIES` times with a linear backoff.
 * If every attempt fails the last error is thrown.
 */
async function withRetry(fn) {
  let lastErr;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS * attempt));
      }
    }
  }

  throw lastErr;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether the Ollama server is reachable.
 * Returns true if the server responds to GET /, false otherwise.
 */
async function isRunning() {
  try {
    const res = await fetchWithTimeout(
      OLLAMA_BASE + '/',
      { method: 'GET' },
      5_000
    );
    return res.ok;
  } catch (_err) {
    return false;
  }
}

/**
 * Spawn `ollama serve` as a detached child process.
 * Sets OLLAMA_MODELS so models are stored on the USB.
 * Returns the ChildProcess instance.
 */
function startOllama() {
  const modelsDir =
    process.env.OLLAMA_MODELS ||
    path.join(__dirname, '..', '..', 'ollama_models');

  const env = { ...process.env, OLLAMA_MODELS: modelsDir };

  const child = spawn('ollama', ['serve'], {
    env,
    stdio: 'ignore',
    detached: true,
  });

  // Allow the parent process to exit even if the child is still running.
  child.unref();

  return child;
}

/**
 * Send a chat-completion request to Ollama.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @param {object} [options]
 * @param {boolean}  [options.stream=false]  If true, return the raw Response
 *   so the caller can consume the NDJSON stream directly.
 * @param {number}   [options.temperature=0.7]
 * @param {number}   [options.maxTokens=1024]
 * @param {string}   [options.model]  Override the default model.
 * @returns {Promise<string|Response>}
 */
function chat(messages, options = {}) {
  const {
    stream = false,
    temperature = 0.7,
    maxTokens = 1024,
    model = MODEL,
  } = options;

  const body = {
    model,
    messages,
    stream,
    options: {
      temperature,
      num_predict: maxTokens,
    },
  };

  // Streaming requests bypass the queue -- the caller is responsible for
  // consuming the response quickly.  Non-streaming requests are queued to
  // avoid overloading the model.
  if (stream) {
    return _chatRequest(body, true);
  }

  return enqueue(() => _chatRequest(body, false));
}

async function _chatRequest(body, returnRaw) {
  try {
    const res = await withRetry(() =>
      fetchWithTimeout(
        OLLAMA_BASE + '/api/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        REQUEST_TIMEOUT_MS
      )
    );

    if (returnRaw) {
      return res;
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown error');
      return _friendlyError(
        `Ollama returned status ${res.status}: ${errText}`
      );
    }

    const data = await res.json();
    return (data.message && data.message.content) || '';
  } catch (err) {
    return _friendlyError(err);
  }
}

/**
 * Send a raw generate (completion) request to Ollama.
 *
 * @param {string} prompt
 * @param {object} [options]
 * @param {boolean}  [options.stream=false]
 * @param {number}   [options.temperature=0.7]
 * @param {number}   [options.maxTokens=1024]
 * @param {string}   [options.model]
 * @returns {Promise<string|Response>}
 */
function generate(prompt, options = {}) {
  const {
    stream = false,
    temperature = 0.7,
    maxTokens = 1024,
    model = MODEL,
  } = options;

  const body = {
    model,
    prompt,
    stream,
    options: {
      temperature,
      num_predict: maxTokens,
    },
  };

  if (stream) {
    return _generateRequest(body, true);
  }

  return enqueue(() => _generateRequest(body, false));
}

async function _generateRequest(body, returnRaw) {
  try {
    const res = await withRetry(() =>
      fetchWithTimeout(
        OLLAMA_BASE + '/api/generate',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        REQUEST_TIMEOUT_MS
      )
    );

    if (returnRaw) {
      return res;
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => 'unknown error');
      return _friendlyError(
        `Ollama returned status ${res.status}: ${errText}`
      );
    }

    const data = await res.json();
    return data.response || '';
  } catch (err) {
    return _friendlyError(err);
  }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * Return a user-friendly error string that is safe to show to students.
 */
function _friendlyError(err) {
  const msg =
    err instanceof Error ? err.message : typeof err === 'string' ? err : '';

  if (msg.includes('abort') || msg.includes('AbortError')) {
    return 'Sorry, the AI tutor took too long to respond. Please try again in a moment.';
  }

  if (msg.includes('ECONNREFUSED') || msg.includes('fetch failed')) {
    return 'The AI tutor is not available right now. Please make sure Ollama is running and try again.';
  }

  console.error('[ollama-client] Error:', msg);
  return 'Oops! Something went wrong with the AI tutor. Please try again.';
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  isRunning,
  startOllama,
  chat,
  generate,
  MODEL,
  OLLAMA_BASE,
};
