/**
 * Arithmetic operations - addition, subtraction, multiplication, division.
 * All computations done in code for accuracy. Never trust an LLM to compute.
 */

const math = require('mathjs');

/**
 * Safely evaluate an arithmetic expression and return the result.
 * Replaces unicode operators and uses mathjs for exact evaluation.
 * @param {string} expression - arithmetic expression like "3 + 4 * 2"
 * @returns {number|null} result or null if invalid
 */
function compute(expression) {
  let expr = expression.trim();
  // Replace unicode math symbols with standard operators
  expr = expr.replace(/\u00d7/g, '*');  // ×
  expr = expr.replace(/\u00f7/g, '/');  // ÷
  expr = expr.replace(/\u2212/g, '-');  // −
  expr = expr.replace(/\u2013/g, '-');  // en-dash
  expr = expr.replace(/\u2014/g, '-');  // em-dash

  // Only allow safe characters: digits, operators, parens, dots, spaces
  if (!/^[\d+\-*/().eE\s]+$/.test(expr)) {
    return null;
  }

  try {
    // Use mathjs for safe, precise evaluation
    const result = math.evaluate(expr);
    // Convert bignumber/fraction to plain number if needed
    if (typeof result === 'object' && result !== null) {
      return math.number(result);
    }
    return result;
  } catch (e) {
    return null;
  }
}

/**
 * Generate a random integer in [min, max] inclusive.
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate addition problems appropriate for the grade level.
 * @param {number} grade - student grade level (K=0, 1-8+)
 * @param {number} count - number of problems to generate
 * @returns {Array<Object>} array of problem objects
 */
function generateAddition(grade, count) {
  if (count === undefined || count === null) count = 5;
  const problems = [];

  for (let i = 0; i < count; i++) {
    let a, b;
    if (grade <= 1) {
      a = randInt(0, 10);
      b = randInt(0, 10);
    } else if (grade === 2) {
      a = randInt(0, 50);
      b = randInt(0, 50);
    } else if (grade <= 4) {
      a = randInt(10, 500);
      b = randInt(10, 500);
    } else {
      a = randInt(100, 9999);
      b = randInt(100, 9999);
    }

    const answer = a + b;
    problems.push({
      type: 'fill_in',
      question: `What is ${a} + ${b}?`,
      answer: String(answer),
      operation: `${a} + ${b}`,
      hint: `Start by adding the ones place: ${a % 10} + ${b % 10}`
    });
  }
  return problems;
}

/**
 * Generate subtraction problems. Ensures no negative answers for young grades.
 * @param {number} grade
 * @param {number} count
 * @returns {Array<Object>}
 */
function generateSubtraction(grade, count) {
  if (count === undefined || count === null) count = 5;
  const problems = [];

  for (let i = 0; i < count; i++) {
    let a, b;
    if (grade <= 1) {
      a = randInt(1, 10);
      b = randInt(0, a);
    } else if (grade === 2) {
      a = randInt(10, 100);
      b = randInt(0, a);
    } else if (grade <= 4) {
      a = randInt(50, 1000);
      b = randInt(1, a);
    } else {
      a = randInt(100, 9999);
      b = randInt(1, a);
    }

    const answer = a - b;
    problems.push({
      type: 'fill_in',
      question: `What is ${a} - ${b}?`,
      answer: String(answer),
      operation: `${a} - ${b}`,
      hint: `Think: what plus ${b} equals ${a}?`
    });
  }
  return problems;
}

/**
 * Generate multiplication problems appropriate for the grade level.
 * @param {number} grade
 * @param {number} count
 * @returns {Array<Object>}
 */
function generateMultiplication(grade, count) {
  if (count === undefined || count === null) count = 5;
  const problems = [];

  for (let i = 0; i < count; i++) {
    let a, b;
    if (grade <= 3) {
      a = randInt(1, 10);
      b = randInt(1, 10);
    } else if (grade === 4) {
      a = randInt(10, 99);
      b = randInt(2, 12);
    } else {
      a = randInt(10, 999);
      b = randInt(2, 99);
    }

    const answer = a * b;
    problems.push({
      type: 'fill_in',
      question: `What is ${a} \u00d7 ${b}?`,
      answer: String(answer),
      operation: `${a} * ${b}`,
      hint: `Think of ${a} groups of ${b}`
    });
  }
  return problems;
}

/**
 * Generate division problems with whole-number answers (no remainders).
 * @param {number} grade
 * @param {number} count
 * @returns {Array<Object>}
 */
function generateDivision(grade, count) {
  if (count === undefined || count === null) count = 5;
  const problems = [];

  for (let i = 0; i < count; i++) {
    let divisor, answer;
    if (grade <= 3) {
      divisor = randInt(1, 10);
      answer = randInt(1, 10);
    } else if (grade === 4) {
      divisor = randInt(2, 12);
      answer = randInt(2, 25);
    } else {
      divisor = randInt(2, 20);
      answer = randInt(2, 50);
    }

    const dividend = divisor * answer; // Ensure clean division
    problems.push({
      type: 'fill_in',
      question: `What is ${dividend} \u00f7 ${divisor}?`,
      answer: String(answer),
      operation: `${dividend} / ${divisor}`,
      hint: `Think: ${divisor} times what equals ${dividend}?`
    });
  }
  return problems;
}

module.exports = {
  compute,
  generateAddition,
  generateSubtraction,
  generateMultiplication,
  generateDivision,
  randInt
};
