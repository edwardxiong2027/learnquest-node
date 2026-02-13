'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PROMPTS_DIR =
  process.env.LEARNQUEST_PROMPTS ||
  path.join(__dirname, '..', 'prompts');

// ---------------------------------------------------------------------------
// Prompt loading
// ---------------------------------------------------------------------------

/**
 * Load a prompt template file from the prompts directory and substitute
 * placeholder variables.
 *
 * Template variables use the `{key}` syntax (matching the existing prompt
 * files such as tutor_math.txt).
 *
 * @param {string} promptFile - Filename relative to the prompts directory,
 *   e.g. "tutor_math.txt".
 * @param {object} [vars={}] - Key/value pairs to substitute.  Every
 *   occurrence of `{key}` in the template is replaced with the
 *   corresponding value.
 * @returns {string} The interpolated prompt text.
 * @throws {Error} If the file cannot be read.
 *
 * @example
 *   loadPrompt('tutor_math.txt', {
 *     grade: '5',
 *     topic: 'fractions',
 *     lesson_title: 'Adding Unlike Fractions',
 *   });
 */
function loadPrompt(promptFile, vars = {}) {
  const filePath = path.join(PROMPTS_DIR, promptFile);
  let template = fs.readFileSync(filePath, 'utf-8');

  for (const [key, value] of Object.entries(vars)) {
    // Replace all occurrences of {key} with the value.  The replacement
    // string is coerced to a string to handle numbers etc. gracefully.
    template = template.replace(
      new RegExp('\\{' + escapeRegExp(key) + '\\}', 'g'),
      String(value)
    );
  }

  return template;
}

/**
 * Escape special regex characters in a string so it can be safely embedded
 * in a RegExp constructor.
 */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// JSON parsing from LLM output
// ---------------------------------------------------------------------------

/**
 * Extract and parse JSON from raw LLM text output.
 *
 * LLMs frequently wrap JSON inside markdown code fences, include trailing
 * commas, or use single quotes instead of double quotes.  This function
 * applies a series of progressively aggressive clean-up steps to recover
 * valid JSON.
 *
 * @param {string} text - Raw text that may contain JSON.
 * @returns {*} The parsed JSON value.
 * @throws {Error} If no valid JSON could be extracted after all attempts.
 */
function parseJsonResponse(text) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('parseJsonResponse: received empty input');
  }

  // 1. Try direct parse first -- the output may already be clean JSON.
  try {
    return JSON.parse(text);
  } catch (_) {
    // continue
  }

  // 2. Extract content from markdown code fences (```json ... ``` or ``` ... ```)
  let extracted = text;
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    extracted = fenceMatch[1].trim();
    try {
      return JSON.parse(extracted);
    } catch (_) {
      // continue with the extracted text for further cleaning
    }
  }

  // 3. Try to locate the outermost JSON structure (object or array)
  const firstBrace = extracted.indexOf('{');
  const firstBracket = extracted.indexOf('[');
  let startChar = -1;
  let endChar = '';

  if (firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket)) {
    startChar = firstBrace;
    endChar = '}';
  } else if (firstBracket >= 0) {
    startChar = firstBracket;
    endChar = ']';
  }

  if (startChar >= 0) {
    // Walk from the end backwards to find the matching closing character.
    const lastClose = extracted.lastIndexOf(endChar);
    if (lastClose > startChar) {
      const candidate = extracted.slice(startChar, lastClose + 1);
      try {
        return JSON.parse(candidate);
      } catch (_) {
        // Try cleaning the candidate
        extracted = candidate;
      }
    }
  }

  // 4. Clean up common LLM quirks
  let cleaned = extracted;

  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

  // Replace single quotes with double quotes (simple heuristic -- avoids
  // mangling apostrophes inside values by only targeting quote-delimited
  // key/value patterns).
  cleaned = cleaned.replace(
    /(?<=[[{,]\s*)'([^']*?)'\s*:/g,
    '"$1":'
  );
  cleaned = cleaned.replace(
    /:\s*'([^']*?)'\s*(?=[,\]}])/g,
    ': "$1"'
  );

  try {
    return JSON.parse(cleaned);
  } catch (_) {
    // continue
  }

  // 5. Last resort: remove non-JSON leading/trailing text and try once more.
  const lastResort = cleaned
    .replace(/^[^[{]*/, '')
    .replace(/[^\]}]*$/, '');

  try {
    return JSON.parse(lastResort);
  } catch (err) {
    throw new Error(
      'parseJsonResponse: unable to extract valid JSON from LLM output. ' +
        'Last parse error: ' +
        err.message
    );
  }
}

// ---------------------------------------------------------------------------
// HTML escaping
// ---------------------------------------------------------------------------

/**
 * Escape HTML special characters to prevent XSS when interpolating
 * user-supplied text into HTML templates.
 *
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return '';

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  loadPrompt,
  parseJsonResponse,
  escapeHtml,
  PROMPTS_DIR,
};
