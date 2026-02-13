'use strict';

const crypto = require('crypto');
const { getDb } = require('./database');

// ---------------------------------------------------------------------------
// LLM response cache backed by the llm_cache table in SQLite.
//
// The cache stores raw LLM responses keyed by an MD5 hash so that repeated
// requests for the same topic + grade combination can be served instantly
// without hitting the model again.
// ---------------------------------------------------------------------------

/**
 * Build a deterministic cache key by hashing the JSON representation of
 * all supplied arguments.  Accepts any number of arguments -- strings,
 * numbers, objects, arrays, etc.
 *
 * @param {...*} parts - Values that together uniquely identify the request.
 * @returns {string} 32-character hex MD5 digest.
 *
 * @example
 *   makeCacheKey('tutor_math', 3, 'fractions')
 *   makeCacheKey({ model: 'phi3', messages: [...] })
 */
function makeCacheKey(...parts) {
  const payload = JSON.stringify(parts);
  return crypto.createHash('md5').update(payload).digest('hex');
}

/**
 * Look up a cached LLM response.
 *
 * @param {string} cacheKey - Key returned by `makeCacheKey`.
 * @returns {string|null} The cached response text, or null on miss.
 */
function getCachedResponse(cacheKey) {
  try {
    const db = getDb();
    const row = db
      .prepare('SELECT response FROM llm_cache WHERE cache_key = ?')
      .get(cacheKey);
    return row ? row.response : null;
  } catch (err) {
    // If the database is not initialized yet or the table is missing, treat
    // it as a cache miss rather than crashing the application.
    console.error('[cache] getCachedResponse error:', err.message);
    return null;
  }
}

/**
 * Store an LLM response in the cache.  Uses INSERT OR REPLACE so that a
 * second call with the same key simply updates the row and timestamp.
 *
 * @param {string} cacheKey  - Key returned by `makeCacheKey`.
 * @param {string} response  - The LLM response text to cache.
 */
function cacheResponse(cacheKey, response) {
  try {
    const db = getDb();
    db.prepare(
      `INSERT OR REPLACE INTO llm_cache (cache_key, response, created_at)
       VALUES (?, ?, datetime('now'))`
    ).run(cacheKey, response);
  } catch (err) {
    // Caching failures are non-fatal -- the app can always regenerate.
    console.error('[cache] cacheResponse error:', err.message);
  }
}

/**
 * Remove all entries from the cache.  Useful during development or when the
 * model is changed and old responses are no longer appropriate.
 *
 * @returns {number} The number of rows deleted.
 */
function clearCache() {
  try {
    const db = getDb();
    const info = db.prepare('DELETE FROM llm_cache').run();
    return info.changes;
  } catch (err) {
    console.error('[cache] clearCache error:', err.message);
    return 0;
  }
}

/**
 * Return the number of entries currently stored in the cache.
 *
 * @returns {number}
 */
function cacheSize() {
  try {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) AS cnt FROM llm_cache').get();
    return row ? row.cnt : 0;
  } catch (err) {
    console.error('[cache] cacheSize error:', err.message);
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  makeCacheKey,
  getCachedResponse,
  cacheResponse,
  clearCache,
  cacheSize,
};
