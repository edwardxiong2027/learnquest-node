'use strict';

/**
 * Math engine API routes - answer checking, step-by-step solving, problem generation.
 * Prefix: /api/math
 */

const router = require('express').Router();
const arithmetic = require('../math-engine/arithmetic');
const fractions = require('../math-engine/fractions');

// -------------------------------------------------------------------------
// Answer validation
// -------------------------------------------------------------------------

/**
 * Validate a student's answer against the correct answer.
 * Handles numeric, fractional, and string equivalences.
 *
 * @param {string} studentAnswer
 * @param {string} correctAnswer
 * @returns {boolean}
 */
function validateAnswer(studentAnswer, correctAnswer) {
  if (!studentAnswer || !correctAnswer) return false;

  const sa = String(studentAnswer).trim().toLowerCase();
  const ca = String(correctAnswer).trim().toLowerCase();

  // Exact string match
  if (sa === ca) return true;

  // Try numeric comparison
  const saNum = parseFloat(sa);
  const caNum = parseFloat(ca);
  if (!isNaN(saNum) && !isNaN(caNum)) {
    if (Math.abs(saNum - caNum) < 0.001) return true;
  }

  // Try fraction comparison
  try {
    const saFrac = fractions.parseFractionStr(sa);
    const caFrac = fractions.parseFractionStr(ca);
    const saSimplified = fractions.simplifyFraction(saFrac.n, saFrac.d);
    const caSimplified = fractions.simplifyFraction(caFrac.n, caFrac.d);
    if (saSimplified.n === caSimplified.n && saSimplified.d === caSimplified.d) {
      return true;
    }
  } catch (_e) {
    // Not valid fractions
  }

  // Try evaluating both as expressions
  const saComp = arithmetic.compute(sa);
  const caComp = arithmetic.compute(ca);
  if (saComp !== null && caComp !== null) {
    if (Math.abs(saComp - caComp) < 0.001) return true;
  }

  return false;
}

// -------------------------------------------------------------------------
// Step-by-step solver
// -------------------------------------------------------------------------

/**
 * Solve a math problem step by step.
 * Returns { steps: string[], answer: string }
 */
function solveSteps(problem, problemType) {
  const steps = [];
  let answer = '';

  if (problemType === 'arithmetic' || problemType === '') {
    const result = arithmetic.compute(problem);
    if (result === null) {
      throw new Error('Could not evaluate expression');
    }
    steps.push(`Start with the expression: ${problem}`);
    steps.push(`Compute the result: ${result}`);
    answer = String(result);
  } else if (problemType === 'fractions') {
    // Parse fraction expression like "3/4 + 1/2"
    const match = problem.match(
      /(\-?\d+)\s*\/\s*(\d+)\s*([+\-\u00d7\u00f7*/x])\s*(\-?\d+)\s*\/\s*(\d+)/
    );
    if (!match) {
      throw new Error('Could not parse fraction expression');
    }
    const [, aNum, aDen, op, bNum, bDen] = match;
    const an = parseInt(aNum, 10);
    const ad = parseInt(aDen, 10);
    const bn = parseInt(bNum, 10);
    const bd = parseInt(bDen, 10);

    steps.push(`Start: ${aNum}/${aDen} ${op} ${bNum}/${bDen}`);

    let result;
    if (op === '+') {
      const commonDen = fractions.lcm(ad, bd);
      steps.push(`Find common denominator: ${commonDen}`);
      steps.push(
        `Convert: ${an * (commonDen / ad)}/${commonDen} + ${bn * (commonDen / bd)}/${commonDen}`
      );
      result = fractions.addFractions(an, ad, bn, bd);
    } else if (op === '-') {
      const commonDen = fractions.lcm(ad, bd);
      steps.push(`Find common denominator: ${commonDen}`);
      result = fractions.subtractFractions(an, ad, bn, bd);
    } else if (op === '\u00d7' || op === '*' || op === 'x') {
      steps.push('Multiply numerators and denominators');
      result = fractions.multiplyFractions(an, ad, bn, bd);
    } else if (op === '\u00f7' || op === '/') {
      steps.push('Flip the second fraction and multiply');
      result = fractions.divideFractions(an, ad, bn, bd);
    } else {
      throw new Error(`Unknown operator: ${op}`);
    }

    const formatted = fractions.formatFraction(result);
    steps.push(`Result: ${formatted}`);
    answer = formatted;
  } else if (problemType === 'equation') {
    // Simple linear equation: ax + b = c  or  x + b = c
    const result = arithmetic.compute(
      problem.replace(/[xX]/g, '0').replace('=', '-(') + ')'
    );
    steps.push(`Given equation: ${problem}`);
    steps.push('Isolate the variable');
    // Basic solver: try to evaluate
    const eqMatch = problem.match(
      /(\-?\d*\.?\d*)\s*[xX]\s*([+\-])\s*(\d+\.?\d*)\s*=\s*(\-?\d+\.?\d*)/
    );
    if (eqMatch) {
      const coeff = eqMatch[1] === '' || eqMatch[1] === '-' ? (eqMatch[1] === '-' ? -1 : 1) : parseFloat(eqMatch[1]);
      const sign = eqMatch[2];
      const bVal = parseFloat(eqMatch[3]);
      const cVal = parseFloat(eqMatch[4]);

      const effectiveB = sign === '+' ? bVal : -bVal;
      steps.push(`${coeff}x + ${effectiveB} = ${cVal}`);
      steps.push(`${coeff}x = ${cVal} - ${effectiveB} = ${cVal - effectiveB}`);
      const xVal = (cVal - effectiveB) / coeff;
      steps.push(`x = ${xVal}`);
      answer = String(xVal);
    } else {
      // Try simpler form: x + b = c
      const simpleMatch = problem.match(
        /[xX]\s*([+\-])\s*(\d+\.?\d*)\s*=\s*(\-?\d+\.?\d*)/
      );
      if (simpleMatch) {
        const sign = simpleMatch[1];
        const bVal = parseFloat(simpleMatch[2]);
        const cVal = parseFloat(simpleMatch[3]);
        const effectiveB = sign === '+' ? bVal : -bVal;
        const xVal = cVal - effectiveB;
        steps.push(`x = ${cVal} - ${effectiveB} = ${xVal}`);
        answer = String(xVal);
      } else {
        steps.push('Could not parse this equation type');
        answer = 'unknown';
      }
    }
  } else if (problemType === 'geometry') {
    steps.push(`Geometry problem: ${problem}`);
    steps.push('Identify the shape and formula needed');
    // Try to extract numbers
    const numbers = problem.match(/\d+\.?\d*/g);
    if (numbers && numbers.length >= 2) {
      const a = parseFloat(numbers[0]);
      const b = parseFloat(numbers[1]);
      if (problem.toLowerCase().includes('area') && problem.toLowerCase().includes('rectangle')) {
        answer = String(a * b);
        steps.push(`Area = length x width = ${a} x ${b} = ${answer}`);
      } else if (problem.toLowerCase().includes('perimeter') && problem.toLowerCase().includes('rectangle')) {
        answer = String(2 * (a + b));
        steps.push(`Perimeter = 2(length + width) = 2(${a} + ${b}) = ${answer}`);
      } else if (problem.toLowerCase().includes('area') && problem.toLowerCase().includes('triangle')) {
        answer = String((a * b) / 2);
        steps.push(`Area = (base x height) / 2 = (${a} x ${b}) / 2 = ${answer}`);
      } else {
        answer = String(a * b);
        steps.push(`Result: ${answer}`);
      }
    } else {
      answer = 'unknown';
      steps.push('Not enough information to solve');
    }
  } else {
    // Default: try arithmetic evaluation
    const result = arithmetic.compute(problem);
    if (result !== null) {
      steps.push(`Evaluate: ${problem}`);
      steps.push(`Result: ${result}`);
      answer = String(result);
    } else {
      throw new Error(`Unsupported problem type: ${problemType}`);
    }
  }

  return { steps, answer };
}

// -------------------------------------------------------------------------
// Problem generation
// -------------------------------------------------------------------------

/**
 * Generate practice problems for a given topic and grade.
 */
function generateProblems(topic, grade, count) {
  const topicLower = (topic || '').toLowerCase();

  if (topicLower.includes('addition') || topicLower === 'add') {
    return arithmetic.generateAddition(grade, count);
  }
  if (topicLower.includes('subtraction') || topicLower === 'subtract') {
    return arithmetic.generateSubtraction(grade, count);
  }
  if (topicLower.includes('multiplication') || topicLower === 'multiply') {
    return arithmetic.generateMultiplication(grade, count);
  }
  if (topicLower.includes('division') || topicLower === 'divide') {
    return arithmetic.generateDivision(grade, count);
  }
  if (topicLower.includes('fraction')) {
    if (topicLower.includes('subtract')) {
      return fractions.generateFractionSubtraction(grade, count);
    }
    if (topicLower.includes('multi')) {
      return fractions.generateFractionMultiply(grade, count);
    }
    return fractions.generateFractionAddition(grade, count);
  }

  // Default to mixed arithmetic
  const problems = [];
  const generators = [
    arithmetic.generateAddition,
    arithmetic.generateSubtraction,
    arithmetic.generateMultiplication,
    arithmetic.generateDivision,
  ];

  for (let i = 0; i < count; i++) {
    const gen = generators[i % generators.length];
    const p = gen(grade, 1);
    if (p.length > 0) problems.push(p[0]);
  }
  return problems;
}

// -------------------------------------------------------------------------
// POST /check
// -------------------------------------------------------------------------
router.post('/check', (req, res) => {
  const data = req.body || {};
  const studentAnswer = data.student_answer || '';
  const correctAnswer = data.correct_answer || '';

  if (!studentAnswer || !correctAnswer) {
    return res
      .status(400)
      .json({ error: 'Both student_answer and correct_answer required' });
  }

  const isCorrect = validateAnswer(studentAnswer, correctAnswer);

  return res.json({
    correct: isCorrect,
    student_answer: studentAnswer,
    correct_answer: correctAnswer,
  });
});

// -------------------------------------------------------------------------
// POST /solve
// -------------------------------------------------------------------------
router.post('/solve', (req, res) => {
  const data = req.body || {};
  const problem = data.problem || '';
  let problemType = data.type || data.topic || '';

  // Auto-detect problem type if not specified
  if (!problemType) {
    if (
      problem.includes('/') &&
      /[+\-\u00d7\u00f7*]/.test(problem)
    ) {
      problemType = 'fractions';
    } else if (problem.includes('=') || /[xX]/.test(problem)) {
      problemType = 'equation';
    } else if (
      /area|perimeter|volume/i.test(problem)
    ) {
      problemType = 'geometry';
    } else {
      problemType = 'arithmetic';
    }
  }

  if (!problem) {
    return res.status(400).json({ error: 'Problem is required' });
  }

  try {
    const result = solveSteps(problem, problemType);
    return res.json({
      problem,
      steps: result.steps,
      answer: result.answer,
    });
  } catch (e) {
    return res
      .status(400)
      .json({ error: `Could not solve: ${e.message}` });
  }
});

// -------------------------------------------------------------------------
// POST /generate
// -------------------------------------------------------------------------
router.post('/generate', (req, res) => {
  const data = req.body || {};
  const topic = data.topic || 'addition';
  const grade = data.grade !== undefined ? data.grade : 3;
  const count = Math.min(data.count || 5, 20);

  try {
    const problems = generateProblems(topic, grade, count);
    return res.json({ problems });
  } catch (e) {
    return res
      .status(400)
      .json({ error: `Could not generate: ${e.message}` });
  }
});

module.exports = router;
