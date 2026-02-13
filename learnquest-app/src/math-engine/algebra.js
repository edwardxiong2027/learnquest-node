/**
 * Algebra operations - expressions, equations, simplification (grades 6-12).
 * No sympy available; we parse and solve linear equations manually,
 * and use mathjs for expression evaluation.
 */

const math = require('mathjs');

/**
 * Solve a linear equation of the form "ax + b = cx + d".
 * Parses the equation string and isolates x.
 * Supports forms like: "2x + 3 = 7", "x - 4 = 10", "3x + 2 = x + 8"
 * @param {string} equationStr - equation like "2x + 3 = 7"
 * @returns {Array<number>} array of solutions (typically one for linear)
 */
function solveLinearEquation(equationStr) {
  try {
    let eq = equationStr.trim();
    // Normalize: replace unicode minus and multiplication
    eq = eq.replace(/\u2212/g, '-').replace(/\u00d7/g, '*').replace(/\u00b2/g, '^2');

    if (eq.indexOf('=') === -1) {
      throw new Error('No equals sign found in equation');
    }

    const sides = eq.split('=');
    if (sides.length !== 2) {
      throw new Error('Multiple equals signs found');
    }

    const leftStr = sides[0].trim();
    const rightStr = sides[1].trim();

    // Parse each side into coefficient of x and constant
    const left = _parseLinearExpr(leftStr);
    const right = _parseLinearExpr(rightStr);

    // left.coeff * x + left.constant = right.coeff * x + right.constant
    // (left.coeff - right.coeff) * x = right.constant - left.constant
    const coeffDiff = left.coeff - right.coeff;
    const constDiff = right.constant - left.constant;

    if (coeffDiff === 0) {
      if (constDiff === 0) {
        return ['infinite']; // Identity: all x work
      }
      return []; // No solution
    }

    const solution = constDiff / coeffDiff;
    // Return clean integer if possible
    if (Number.isInteger(solution)) {
      return [solution];
    }
    // Try to return a clean fraction
    const frac = math.fraction(solution);
    if (frac.d === 1) {
      return [frac.s * frac.n];
    }
    return [math.number(frac)];
  } catch (e) {
    throw new Error(`Cannot solve equation: ${e.message}`);
  }
}

/**
 * Parse a linear expression string into {coeff, constant}.
 * E.g., "2x + 3" -> {coeff: 2, constant: 3}
 *        "-x + 5" -> {coeff: -1, constant: 5}
 *        "7"      -> {coeff: 0, constant: 7}
 * @param {string} expr
 * @returns {{coeff: number, constant: number}}
 */
function _parseLinearExpr(expr) {
  expr = expr.replace(/\s+/g, '');

  let coeff = 0;
  let constant = 0;

  // Tokenize: split into terms keeping the sign
  // Insert '+' before '-' to split properly, but not for negative at start
  let normalized = expr;
  // Handle leading negative
  if (normalized.startsWith('-')) {
    normalized = '~' + normalized.substring(1);
  }
  normalized = normalized.replace(/-/g, '+-');
  if (normalized.startsWith('~')) {
    normalized = '-' + normalized.substring(1);
  }

  const terms = normalized.split('+').filter(t => t.length > 0);

  for (let term of terms) {
    term = term.trim();
    if (term.indexOf('x') !== -1) {
      // This is an x-term
      let coeffStr = term.replace('x', '');
      if (coeffStr === '' || coeffStr === '+') {
        coeff += 1;
      } else if (coeffStr === '-') {
        coeff += -1;
      } else {
        coeff += parseFloat(coeffStr);
      }
    } else {
      // This is a constant term
      constant += parseFloat(term);
    }
  }

  return { coeff, constant };
}

/**
 * Evaluate a mathematical expression, optionally substituting x.
 * @param {string} exprStr - expression like "2x + 3" or "x^2 + 1"
 * @param {number|null} xValue - value to substitute for x
 * @returns {number} result
 */
function evaluateExpression(exprStr, xValue) {
  try {
    let expr = exprStr.trim();
    // Normalize unicode
    expr = expr.replace(/\u00b2/g, '^2');
    expr = expr.replace(/\u00b3/g, '^3');
    expr = expr.replace(/\u2212/g, '-');
    expr = expr.replace(/\u00d7/g, '*');
    expr = expr.replace(/\u00f7/g, '/');

    // Add implicit multiplication: "2x" -> "2*x", "3x^2" -> "3*x^2"
    expr = expr.replace(/(\d)(x)/g, '$1*$2');

    if (xValue !== undefined && xValue !== null) {
      // Create a scope with x defined
      const scope = { x: xValue };
      return math.evaluate(expr, scope);
    }

    return math.evaluate(expr);
  } catch (e) {
    throw new Error(`Cannot evaluate expression: ${e.message}`);
  }
}

/**
 * Generate linear equation problems for grades 6-8+.
 * @param {number} grade
 * @param {number} count
 * @returns {Array<Object>}
 */
function generateLinearEquations(grade, count) {
  if (count === undefined || count === null) count = 5;
  const problems = [];

  for (let i = 0; i < count; i++) {
    let equation, answer;

    if (grade === 6) {
      // Simple: ax + b = c
      const a = _randChoice([1, 2, 3, 4, 5]);
      answer = _randInt(-10, 10);
      const b = _randInt(-10, 10);
      const c = a * answer + b;
      if (a === 1) {
        equation = b >= 0 ? `x + ${b} = ${c}` : `x - ${Math.abs(b)} = ${c}`;
      } else {
        equation = b >= 0 ? `${a}x + ${b} = ${c}` : `${a}x - ${Math.abs(b)} = ${c}`;
      }
    } else if (grade === 7) {
      // ax + b = cx + d
      const a = _randInt(2, 6);
      const cCoeff = _randInt(1, a - 1);
      answer = _randInt(-5, 10);
      const b = _randInt(-10, 10);
      const d = a * answer + b - cCoeff * answer;
      equation = `${a}x + ${b} = ${cCoeff}x + ${d}`;
    } else if (grade === 8) {
      // More complex with larger numbers
      const a = _randInt(2, 8);
      const b = _randInt(-15, 15);
      answer = _randInt(-10, 10);
      const c = a * answer + b;
      equation = b >= 0 ? `${a}x + ${b} = ${c}` : `${a}x - ${Math.abs(b)} = ${c}`;
    } else {
      // Grades 9+: multi-step with variables on both sides
      const a = _randInt(2, 6);
      const b = _randInt(-8, 8);
      const cCoeff = _randInt(1, 4);
      answer = _randInt(-5, 10);
      const d = a * answer + b - cCoeff * answer;
      equation = `${a}x + ${b} = ${cCoeff}x + ${d}`;
    }

    problems.push({
      type: 'fill_in',
      question: `Solve for x: ${equation}`,
      answer: String(answer),
      hint: 'Isolate x by doing the same operation on both sides of the equation.'
    });
  }
  return problems;
}

/**
 * Generate expression evaluation problems.
 * @param {number} grade
 * @param {number} count
 * @returns {Array<Object>}
 */
function generateExpressionEvaluation(grade, count) {
  if (count === undefined || count === null) count = 5;
  const problems = [];

  for (let i = 0; i < count; i++) {
    const xVal = _randInt(1, 10);
    let expr, answer;

    if (grade <= 6) {
      const a = _randInt(1, 5);
      const b = _randInt(1, 10);
      expr = `${a}x + ${b}`;
      answer = a * xVal + b;
    } else {
      const a = _randInt(1, 5);
      const b = _randInt(-5, 5);
      const c = _randInt(-10, 10);
      if (grade === 8) {
        expr = `${a}x\u00b2 + ${b}x + ${c}`;
        answer = a * xVal * xVal + b * xVal + c;
      } else {
        expr = `${a}x + ${b}`;
        answer = a * xVal + b;
      }
    }

    problems.push({
      type: 'fill_in',
      question: `If x = ${xVal}, what is ${expr}?`,
      answer: String(answer),
      hint: `Replace x with ${xVal} and calculate step by step.`
    });
  }
  return problems;
}

// --- Helper functions ---

function _randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function _randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
  solveLinearEquation,
  evaluateExpression,
  generateLinearEquations,
  generateExpressionEvaluation,
  _parseLinearExpr  // exported for testing
};
