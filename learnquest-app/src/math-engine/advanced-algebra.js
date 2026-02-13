/**
 * Advanced algebra - quadratics, factoring, systems, polynomials, complex numbers.
 * Grades 9-12. No sympy available; all operations implemented manually or via mathjs.
 */

const math = require('mathjs');

/**
 * Solve ax^2 + bx + c = 0 using the quadratic formula.
 * Returns list of solutions (real or complex strings).
 * @param {number} a
 * @param {number} b
 * @param {number} c
 * @returns {Array<number|string>}
 */
function solveQuadratic(a, b, c) {
  const discriminant = b * b - 4 * a * c;

  if (discriminant > 0) {
    const x1 = (-b + Math.sqrt(discriminant)) / (2 * a);
    const x2 = (-b - Math.sqrt(discriminant)) / (2 * a);
    return [x1, x2].map(r => _round(r, 4)).sort((a, b) => a - b);
  } else if (discriminant === 0) {
    const x1 = -b / (2 * a);
    return [_round(x1, 4)];
  } else {
    // Complex roots
    const real = _round(-b / (2 * a), 4);
    const imag = _round(Math.sqrt(-discriminant) / (2 * a), 4);
    return [`${real} + ${imag}i`, `${real} - ${imag}i`];
  }
}

/**
 * Factor ax^2 + bx + c using its roots.
 * If a=1 and roots are integers, returns "(x - r1)(x - r2)".
 * Otherwise returns the expanded form description.
 * @param {number} a
 * @param {number} b
 * @param {number} c
 * @returns {string}
 */
function factorQuadratic(a, b, c) {
  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    // Cannot factor over reals
    return `${a}x\u00b2 + ${b}x + ${c} (cannot factor over reals)`;
  }

  const x1 = (-b + Math.sqrt(discriminant)) / (2 * a);
  const x2 = (-b - Math.sqrt(discriminant)) / (2 * a);

  // Check if roots are integers (or close to it)
  const isInt1 = Math.abs(x1 - Math.round(x1)) < 0.0001;
  const isInt2 = Math.abs(x2 - Math.round(x2)) < 0.0001;

  if (a === 1 && isInt1 && isInt2) {
    const r1 = Math.round(x1);
    const r2 = Math.round(x2);
    // (x - r1)(x - r2)
    const term1 = r1 === 0 ? 'x' : (r1 > 0 ? `(x - ${r1})` : `(x + ${Math.abs(r1)})`);
    const term2 = r2 === 0 ? 'x' : (r2 > 0 ? `(x - ${r2})` : `(x + ${Math.abs(r2)})`);
    return `${term1}${term2}`;
  }

  // General case with a != 1 or non-integer roots
  if (isInt1 && isInt2) {
    const r1 = Math.round(x1);
    const r2 = Math.round(x2);
    // a(x - r1)(x - r2)
    const prefix = a === 1 ? '' : `${a}`;
    const term1 = r1 >= 0 ? `(x - ${r1})` : `(x + ${Math.abs(r1)})`;
    const term2 = r2 >= 0 ? `(x - ${r2})` : `(x + ${Math.abs(r2)})`;
    return `${prefix}${term1}${term2}`;
  }

  // Cannot factor nicely
  let str = '';
  if (a !== 0) str += (a === 1 ? 'x\u00b2' : (a === -1 ? '-x\u00b2' : `${a}x\u00b2`));
  if (b > 0) str += ` + ${b === 1 ? '' : b}x`;
  else if (b < 0) str += ` - ${b === -1 ? '' : Math.abs(b)}x`;
  if (c > 0) str += ` + ${c}`;
  else if (c < 0) str += ` - ${Math.abs(c)}`;
  return str.trim() + ' (no integer factoring)';
}

/**
 * Solve a 2x2 system of linear equations using Cramer's rule.
 * a1*x + b1*y = c1
 * a2*x + b2*y = c2
 * @returns {{x: number, y: number}|null} solution or null if no unique solution
 */
function solveSystem2x2(a1, b1, c1, a2, b2, c2) {
  const det = a1 * b2 - a2 * b1;
  if (det === 0) {
    return null; // No unique solution (parallel or coincident)
  }
  const x = (c1 * b2 - c2 * b1) / det;
  const y = (a1 * c2 - a2 * c1) / det;
  return { x, y };
}

// --- Random helpers ---

function _randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function _randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function _round(val, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

/**
 * Generate quadratic equation problems (factoring-friendly).
 * @param {number} grade
 * @param {number} count
 * @returns {Array<Object>}
 */
function generateQuadraticProblems(grade, count) {
  if (count === undefined || count === null) count = 5;
  const problems = [];

  for (let i = 0; i < count; i++) {
    const r1 = _randInt(-6, 6);
    const r2 = _randInt(-6, 6);
    const a = 1;
    const b = -(r1 + r2);
    const c = r1 * r2;

    const bStr = b > 0 ? `+ ${b}` : (b < 0 ? `- ${Math.abs(b)}` : '');
    const cStr = c > 0 ? `+ ${c}` : (c < 0 ? `- ${Math.abs(c)}` : '');

    const equation = `x\u00b2 ${bStr}x ${cStr} = 0`.replace(/\s+/g, ' ').trim();
    const roots = [r1, r2].sort((a, b) => a - b);
    const answer = r1 !== r2
      ? `x = ${roots[0]}, x = ${roots[1]}`
      : `x = ${r1}`;

    const probType = _randChoice(['solve', 'factor']);
    if (probType === 'solve') {
      problems.push({
        type: 'fill_in',
        question: `Solve: ${equation}`,
        answer: answer,
        hint: 'Try factoring or use the quadratic formula: x = (-b \u00b1 \u221a(b\u00b2-4ac)) / 2a'
      });
    } else {
      const factored = factorQuadratic(a, b, c);
      problems.push({
        type: 'fill_in',
        question: `Factor: x\u00b2 ${bStr}x ${cStr}`.trim(),
        answer: factored,
        hint: 'Find two numbers that multiply to give c and add to give b.'
      });
    }
  }
  return problems;
}

/**
 * Generate systems of equations (2x2).
 * @param {number} grade
 * @param {number} count
 * @returns {Array<Object>}
 */
function generateSystemProblems(grade, count) {
  if (count === undefined || count === null) count = 5;
  const problems = [];
  const coeffChoices = [1, 2, 3, -1, -2];

  for (let i = 0; i < count; i++) {
    const solX = _randInt(-5, 5);
    const solY = _randInt(-5, 5);

    let a1 = _randChoice(coeffChoices);
    let b1 = _randChoice(coeffChoices);
    const c1 = a1 * solX + b1 * solY;

    let a2 = _randChoice(coeffChoices);
    let b2 = _randChoice(coeffChoices);
    // Ensure the system has a unique solution (non-parallel lines)
    while (a1 * b2 === a2 * b1) {
      a2 = _randChoice(coeffChoices);
      b2 = _randChoice(coeffChoices);
    }
    const c2 = a2 * solX + b2 * solY;

    function fmtEq(a, b, c) {
      const parts = [];
      if (a === 1) parts.push('x');
      else if (a === -1) parts.push('-x');
      else parts.push(`${a}x`);

      if (b === 1) parts.push('+ y');
      else if (b === -1) parts.push('- y');
      else if (b > 0) parts.push(`+ ${b}y`);
      else parts.push(`- ${Math.abs(b)}y`);

      return `${parts.join(' ')} = ${c}`;
    }

    const eq1 = fmtEq(a1, b1, c1);
    const eq2 = fmtEq(a2, b2, c2);

    problems.push({
      type: 'fill_in',
      question: `Solve the system:\n${eq1}\n${eq2}`,
      answer: `x = ${solX}, y = ${solY}`,
      hint: 'Try substitution or elimination to solve for one variable first.'
    });
  }
  return problems;
}

/**
 * Generate polynomial operations problems (expand, simplify).
 * Without sympy, we compute the expansion manually.
 * @param {number} grade
 * @param {number} count
 * @returns {Array<Object>}
 */
function generatePolynomialProblems(grade, count) {
  if (count === undefined || count === null) count = 5;
  const problems = [];

  for (let i = 0; i < count; i++) {
    const probType = _randChoice(['expand', 'simplify']);

    if (probType === 'expand') {
      // (ax + b)(cx + d) = acx^2 + (ad+bc)x + bd
      const a = _randInt(1, 3);
      const b = _randInt(-5, 5);
      const c = _randInt(1, 3);
      const d = _randInt(-5, 5);

      const coeffA = a * c;
      const coeffB = a * d + b * c;
      const coeffC = b * d;

      // Format the expanded result
      const answer = _formatPolynomial(coeffA, coeffB, coeffC);

      problems.push({
        type: 'fill_in',
        question: `Expand: (${a}x + ${b})(${c}x + ${d})`,
        answer: answer,
        hint: 'Use FOIL: First, Outer, Inner, Last, then combine like terms.'
      });
    } else {
      // (ax^2 + bx + c) + (dx + e)
      const a = _randInt(1, 3);
      const b = _randInt(-5, 5);
      const c = _randInt(-5, 5);
      const d = _randInt(1, 3);
      const e = _randInt(-5, 5);

      const resultA = a;
      const resultB = b + d;
      const resultC = c + e;

      const answer = _formatPolynomial(resultA, resultB, resultC);

      problems.push({
        type: 'fill_in',
        question: `Simplify: (${a}x\u00b2 + ${b}x + ${c}) + (${d}x + ${e})`,
        answer: answer,
        hint: 'Combine like terms: group x\u00b2 terms, x terms, and constants.'
      });
    }
  }
  return problems;
}

/**
 * Format a polynomial ax^2 + bx + c as a string.
 * Handles sign formatting nicely.
 */
function _formatPolynomial(a, b, c) {
  let parts = [];

  // x^2 term
  if (a !== 0) {
    if (a === 1) parts.push('x**2');
    else if (a === -1) parts.push('-x**2');
    else parts.push(`${a}*x**2`);
  }

  // x term
  if (b !== 0) {
    if (parts.length === 0) {
      if (b === 1) parts.push('x');
      else if (b === -1) parts.push('-x');
      else parts.push(`${b}*x`);
    } else {
      if (b === 1) parts.push('+ x');
      else if (b === -1) parts.push('- x');
      else if (b > 0) parts.push(`+ ${b}*x`);
      else parts.push(`- ${Math.abs(b)}*x`);
    }
  }

  // constant term
  if (c !== 0) {
    if (parts.length === 0) {
      parts.push(String(c));
    } else {
      if (c > 0) parts.push(`+ ${c}`);
      else parts.push(`- ${Math.abs(c)}`);
    }
  }

  if (parts.length === 0) return '0';
  return parts.join(' ');
}

/**
 * Generate complex number arithmetic problems.
 * @param {number} grade
 * @param {number} count
 * @returns {Array<Object>}
 */
function generateComplexNumberProblems(grade, count) {
  if (count === undefined || count === null) count = 5;
  const problems = [];

  for (let i = 0; i < count; i++) {
    const a1 = _randInt(-5, 5);
    const b1 = _randInt(-5, 5);
    const a2 = _randInt(-5, 5);
    const b2 = _randInt(-5, 5);

    const op = _randChoice(['+', '-', '*']);
    let realResult, imagResult, question;

    if (op === '+') {
      realResult = a1 + a2;
      imagResult = b1 + b2;
      question = `(${a1} + ${b1}i) + (${a2} + ${b2}i)`;
    } else if (op === '-') {
      realResult = a1 - a2;
      imagResult = b1 - b2;
      question = `(${a1} + ${b1}i) - (${a2} + ${b2}i)`;
    } else {
      // (a1 + b1*i)(a2 + b2*i) = (a1*a2 - b1*b2) + (a1*b2 + b1*a2)*i
      realResult = a1 * a2 - b1 * b2;
      imagResult = a1 * b2 + b1 * a2;
      question = `(${a1} + ${b1}i) * (${a2} + ${b2}i)`;
    }

    // Format the answer
    let answer;
    if (imagResult === 0) {
      answer = String(realResult);
    } else if (realResult === 0) {
      answer = imagResult === 1 ? 'i' : (imagResult === -1 ? '-i' : `${imagResult}i`);
    } else {
      const imagStr = imagResult === 1 ? 'i' : (imagResult === -1 ? '-i' : `${imagResult}i`);
      if (imagResult > 0) {
        answer = `${realResult} + ${imagResult === 1 ? '' : imagResult}i`;
      } else {
        answer = `${realResult} - ${imagResult === -1 ? '' : Math.abs(imagResult)}i`;
      }
    }

    problems.push({
      type: 'fill_in',
      question: `Compute: ${question}`,
      answer: answer,
      hint: 'Remember that i\u00b2 = -1. Combine real and imaginary parts separately.'
    });
  }
  return problems;
}

module.exports = {
  solveQuadratic,
  factorQuadratic,
  solveSystem2x2,
  generateQuadraticProblems,
  generateSystemProblems,
  generatePolynomialProblems,
  generateComplexNumberProblems
};
