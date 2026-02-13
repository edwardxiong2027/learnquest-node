/**
 * Fraction operations - add, subtract, multiply, divide, simplify, compare.
 * Uses mathjs fraction type for exact rational arithmetic.
 */

const math = require('mathjs');

/**
 * Compute the greatest common divisor of two integers.
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

/**
 * Compute the least common multiple of two integers.
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b);
}

/**
 * Add two fractions and return simplified result as {n, d}.
 * @param {number} aNum - numerator of first fraction
 * @param {number} aDen - denominator of first fraction
 * @param {number} bNum - numerator of second fraction
 * @param {number} bDen - denominator of second fraction
 * @returns {{n: number, d: number}} simplified fraction
 */
function addFractions(aNum, aDen, bNum, bDen) {
  const f = math.add(math.fraction(aNum, aDen), math.fraction(bNum, bDen));
  return { n: f.s * f.n, d: f.d };
}

/**
 * Subtract two fractions and return simplified result as {n, d}.
 */
function subtractFractions(aNum, aDen, bNum, bDen) {
  const f = math.subtract(math.fraction(aNum, aDen), math.fraction(bNum, bDen));
  return { n: f.s * f.n, d: f.d };
}

/**
 * Multiply two fractions and return simplified result as {n, d}.
 */
function multiplyFractions(aNum, aDen, bNum, bDen) {
  const f = math.multiply(math.fraction(aNum, aDen), math.fraction(bNum, bDen));
  return { n: f.s * f.n, d: f.d };
}

/**
 * Divide two fractions and return simplified result as {n, d}.
 */
function divideFractions(aNum, aDen, bNum, bDen) {
  const f = math.divide(math.fraction(aNum, aDen), math.fraction(bNum, bDen));
  return { n: f.s * f.n, d: f.d };
}

/**
 * Simplify a fraction. Returns {n, d} in lowest terms.
 * @param {number} num
 * @param {number} den
 * @returns {{n: number, d: number}}
 */
function simplifyFraction(num, den) {
  const f = math.fraction(num, den);
  return { n: f.s * f.n, d: f.d };
}

/**
 * Format a fraction object {n, d} as a string, handling mixed numbers.
 * Examples: {n:5, d:4} -> "1 1/4", {n:3, d:1} -> "3", {n:2, d:3} -> "2/3"
 * @param {{n: number, d: number}} frac
 * @returns {string}
 */
function formatFraction(frac) {
  let num = frac.n;
  const den = frac.d;

  if (den === 1) {
    return String(num);
  }

  const absNum = Math.abs(num);
  if (absNum > den) {
    const sign = num < 0 ? -1 : 1;
    const whole = Math.floor(absNum / den);
    const remainder = absNum % den;
    if (remainder === 0) {
      return String(sign * whole);
    }
    return `${sign * whole} ${remainder}/${den}`;
  }

  return `${num}/${den}`;
}

/**
 * Parse a fraction string like "3/4", "1 1/2", "0.5", "7" into {n, d}.
 * @param {string} s
 * @returns {{n: number, d: number}}
 */
function parseFractionStr(s) {
  s = s.trim();

  // Handle decimal (but not fraction with /)
  if (s.indexOf('.') !== -1 && s.indexOf('/') === -1) {
    const f = math.fraction(parseFloat(s));
    return { n: f.s * f.n, d: f.d };
  }

  // Handle mixed number: "1 3/4" or "-2 1/3"
  const parts = s.split(/\s+/);
  if (parts.length === 2 && parts[1].indexOf('/') !== -1) {
    const whole = parseInt(parts[0], 10);
    const fracParts = parts[1].split('/');
    const num = parseInt(fracParts[0], 10);
    const den = parseInt(fracParts[1], 10);
    const sign = whole < 0 ? -1 : 1;
    return { n: sign * (Math.abs(whole) * den + num), d: den };
  }

  // Handle simple fraction: "3/4"
  if (s.indexOf('/') !== -1) {
    const fracParts = s.split('/');
    const num = parseInt(fracParts[0], 10);
    const den = parseInt(fracParts[1], 10);
    const g = gcd(Math.abs(num), Math.abs(den));
    const sign = (den < 0) ? -1 : 1;
    return { n: sign * num / g, d: sign * den / g };
  }

  // Handle whole number
  return { n: parseInt(s, 10), d: 1 };
}

/**
 * Helper to generate a random integer in [min, max].
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate fraction addition problems.
 * @param {number} grade
 * @param {number} count
 * @returns {Array<Object>}
 */
function generateFractionAddition(grade, count) {
  if (count === undefined || count === null) count = 5;
  const problems = [];
  const denChoices = [2, 3, 4, 5, 6, 8];

  for (let i = 0; i < count; i++) {
    let aNum, aDen, bNum, bDen;

    if (grade <= 4) {
      // Same denominator for younger students
      const den = denChoices[randInt(0, denChoices.length - 1)];
      aNum = randInt(1, den - 1);
      bNum = randInt(1, den - 1);
      aDen = den;
      bDen = den;
    } else {
      // Different denominators for older students
      aDen = denChoices[randInt(0, denChoices.length - 1)];
      bDen = denChoices[randInt(0, denChoices.length - 1)];
      aNum = randInt(1, aDen - 1);
      bNum = randInt(1, bDen - 1);
    }

    const result = addFractions(aNum, aDen, bNum, bDen);
    const answerStr = formatFraction(result);
    const commonDen = lcm(aDen, bDen);

    problems.push({
      type: 'fill_in',
      question: `What is ${aNum}/${aDen} + ${bNum}/${bDen}?`,
      answer: answerStr,
      operation: `${aNum}/${aDen} + ${bNum}/${bDen}`,
      hint: `Find a common denominator first. Try ${commonDen}.`
    });
  }
  return problems;
}

/**
 * Generate fraction subtraction problems.
 * @param {number} grade
 * @param {number} count
 * @returns {Array<Object>}
 */
function generateFractionSubtraction(grade, count) {
  if (count === undefined || count === null) count = 5;
  const problems = [];
  const denChoices = [2, 3, 4, 5, 6, 8];

  for (let i = 0; i < count; i++) {
    const den = denChoices[randInt(0, denChoices.length - 1)];
    let aNum = randInt(2, den);
    let bNum = randInt(1, aNum - 1);
    let bDen;

    if (grade >= 5 && Math.random() > 0.5) {
      bDen = denChoices[randInt(0, denChoices.length - 1)];
    } else {
      bDen = den;
    }

    let result = subtractFractions(aNum, den, bNum, bDen);
    // Ensure positive result - swap if negative
    if (result.n < 0) {
      const temp = aNum;
      aNum = bNum;
      bNum = temp;
      result = subtractFractions(aNum, den, bNum, bDen);
    }

    const answerStr = formatFraction(result);

    problems.push({
      type: 'fill_in',
      question: `What is ${aNum}/${den} - ${bNum}/${bDen}?`,
      answer: answerStr,
      hint: 'Make sure both fractions have the same denominator before subtracting.'
    });
  }
  return problems;
}

/**
 * Generate fraction multiplication problems.
 * @param {number} grade
 * @param {number} count
 * @returns {Array<Object>}
 */
function generateFractionMultiply(grade, count) {
  if (count === undefined || count === null) count = 5;
  const problems = [];
  const denChoices = [2, 3, 4, 5, 6];

  for (let i = 0; i < count; i++) {
    const aDen = denChoices[randInt(0, denChoices.length - 1)];
    const bDen = denChoices[randInt(0, denChoices.length - 1)];
    const aNum = randInt(1, aDen);
    const bNum = randInt(1, bDen);

    const result = multiplyFractions(aNum, aDen, bNum, bDen);
    const answerStr = formatFraction(result);

    problems.push({
      type: 'fill_in',
      question: `What is ${aNum}/${aDen} \u00d7 ${bNum}/${bDen}?`,
      answer: answerStr,
      hint: 'Multiply the numerators together, then multiply the denominators.'
    });
  }
  return problems;
}

module.exports = {
  gcd,
  lcm,
  addFractions,
  subtractFractions,
  multiplyFractions,
  divideFractions,
  simplifyFraction,
  formatFraction,
  parseFractionStr,
  generateFractionAddition,
  generateFractionSubtraction,
  generateFractionMultiply
};
