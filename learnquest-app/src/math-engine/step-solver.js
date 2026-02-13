/**
 * Step-by-step math solver - generates deterministic solution steps.
 * Dispatches to specific solvers based on problem type.
 * No sympy available; we parse and solve manually.
 */

const { gcd } = require('./fractions');

/**
 * Generate step-by-step solution for a math problem.
 * @param {string} problem - the problem text
 * @param {string} problemType - one of: 'arithmetic', 'fraction', 'equation', 'geometry',
 *                                'quadratic', 'trig', 'logarithm'
 * @returns {{steps: string[], answer: string}}
 */
function solveSteps(problem, problemType) {
  problem = problem.trim();
  problemType = (problemType || 'arithmetic').toLowerCase();

  if (['arithmetic', 'addition', 'subtraction', 'multiplication', 'division'].includes(problemType)) {
    return _solveArithmetic(problem);
  } else if (['fraction', 'fractions'].includes(problemType)) {
    return _solveFraction(problem);
  } else if (['equation', 'linear', 'algebra'].includes(problemType)) {
    return _solveEquation(problem);
  } else if (['area', 'perimeter', 'geometry'].includes(problemType)) {
    return _solveGeometry(problem);
  } else if (problemType === 'quadratic') {
    return _solveQuadratic(problem);
  } else if (['trig', 'trigonometry'].includes(problemType)) {
    return _solveTrig(problem);
  } else if (['logarithm', 'log'].includes(problemType)) {
    return _solveLogarithm(problem);
  } else {
    return _solveArithmetic(problem);
  }
}

/**
 * Solve basic arithmetic step by step.
 */
function _solveArithmetic(problem) {
  // Clean up
  let expr = problem
    .replace(/\u00d7/g, '*')
    .replace(/\u00f7/g, '/')
    .replace(/\u2212/g, '-');
  expr = expr.replace(/[Ww]hat is\s*/i, '');
  expr = expr.replace(/\?/g, '').trim();

  try {
    // Safe evaluation: only digits and operators
    if (!/^[\d+\-*/().eE\s]+$/.test(expr)) {
      return { steps: ['Could not parse the expression.'], answer: 'Unknown' };
    }
    // Use Function to evaluate (safe since we validated the characters)
    const result = Function('"use strict"; return (' + expr + ')')();

    const steps = [
      `Start with: ${problem}`,
      `Calculate: ${expr}`,
      `The answer is: ${result}`
    ];

    return { steps, answer: String(result) };
  } catch (e) {
    return { steps: ['Could not parse the expression.'], answer: 'Unknown' };
  }
}

/**
 * Solve fraction problems step by step.
 * Extracts two fractions and the operator, shows LCD steps.
 */
function _solveFraction(problem) {
  // Extract fractions: patterns like "3/4"
  const fracPattern = /(\d+)\s*\/\s*(\d+)/g;
  const matches = [];
  let match;
  while ((match = fracPattern.exec(problem)) !== null) {
    matches.push({ n: parseInt(match[1], 10), d: parseInt(match[2], 10) });
  }

  if (matches.length < 2) {
    return _solveArithmetic(problem);
  }

  const a = matches[0];
  const b = matches[1];

  // Detect operator
  let op, resultN, resultD;
  // Check for operator in the text between the fractions
  const textBetween = problem.substring(
    problem.indexOf(String(a.d)) + String(a.d).length,
    problem.lastIndexOf(String(b.n))
  );

  if (textBetween.indexOf('+') !== -1) {
    op = '+';
  } else if (textBetween.indexOf('-') !== -1 || textBetween.indexOf('\u2212') !== -1) {
    op = '-';
  } else if (textBetween.indexOf('\u00d7') !== -1 || textBetween.indexOf('*') !== -1) {
    op = '\u00d7';
  } else if (textBetween.indexOf('\u00f7') !== -1) {
    op = '\u00f7';
  } else {
    op = '+'; // default
  }

  const steps = [`Start with: ${a.n}/${a.d} ${op} ${b.n}/${b.d}`];

  if (op === '+' || op === '-') {
    if (a.d !== b.d) {
      const lcd = (a.d * b.d) / gcd(a.d, b.d);
      const newANum = a.n * (lcd / a.d);
      const newBNum = b.n * (lcd / b.d);
      steps.push(`Find common denominator: ${lcd}`);
      steps.push(`Convert: ${newANum}/${lcd} ${op} ${newBNum}/${lcd}`);
      if (op === '+') {
        resultN = newANum + newBNum;
      } else {
        resultN = newANum - newBNum;
      }
      resultD = lcd;
    } else {
      steps.push(`Same denominator: ${a.d}`);
      if (op === '+') {
        resultN = a.n + b.n;
      } else {
        resultN = a.n - b.n;
      }
      resultD = a.d;
    }
  } else if (op === '\u00d7') {
    steps.push(`Multiply numerators: ${a.n} \u00d7 ${b.n} = ${a.n * b.n}`);
    steps.push(`Multiply denominators: ${a.d} \u00d7 ${b.d} = ${a.d * b.d}`);
    resultN = a.n * b.n;
    resultD = a.d * b.d;
  } else if (op === '\u00f7') {
    steps.push(`Flip the second fraction: ${b.d}/${b.n}`);
    steps.push(`Then multiply: ${a.n}/${a.d} \u00d7 ${b.d}/${b.n}`);
    resultN = a.n * b.d;
    resultD = a.d * b.n;
  }

  // Simplify
  const g = gcd(Math.abs(resultN), Math.abs(resultD));
  resultN = resultN / g;
  resultD = resultD / g;

  // Handle negative denominator
  if (resultD < 0) {
    resultN = -resultN;
    resultD = -resultD;
  }

  let answerStr;
  if (resultD === 1) {
    answerStr = String(resultN);
  } else if (Math.abs(resultN) > resultD) {
    const whole = Math.floor(Math.abs(resultN) / resultD);
    const rem = Math.abs(resultN) % resultD;
    const sign = resultN < 0 ? -1 : 1;
    if (rem === 0) {
      answerStr = String(sign * whole);
    } else {
      answerStr = `${sign * whole} ${rem}/${resultD}`;
      steps.push(`Convert to mixed number: ${answerStr}`);
    }
  } else {
    answerStr = `${resultN}/${resultD}`;
  }

  steps.push(`Answer: ${answerStr}`);
  return { steps, answer: answerStr };
}

/**
 * Solve a linear equation step by step (without sympy).
 * Parses "ax + b = cx + d" forms.
 */
function _solveEquation(problem) {
  let eq = problem.replace(/Solve for x:/i, '').replace(/Solve:/i, '').trim();

  try {
    if (eq.indexOf('=') === -1) {
      return { steps: ['No equals sign found.'], answer: 'Unknown' };
    }

    const sides = eq.split('=');
    const leftStr = sides[0].trim();
    const rightStr = sides[1].trim();

    // Parse each side
    const left = _parseLinearExpr(leftStr);
    const right = _parseLinearExpr(rightStr);

    const steps = [`Start with: ${eq}`];

    // Move x terms to the left, constants to the right
    const coeffDiff = left.coeff - right.coeff;
    const constDiff = right.constant - left.constant;

    if (left.coeff !== 0 && right.coeff !== 0) {
      steps.push(`Move x terms to one side: ${coeffDiff}x = ${constDiff}`);
    } else if (left.constant !== 0) {
      steps.push(`Subtract ${left.constant} from both sides`);
    }

    if (coeffDiff === 0) {
      if (constDiff === 0) {
        return { steps: [...steps, 'This is an identity - all values of x work.'], answer: 'all real numbers' };
      }
      return { steps: [...steps, 'No solution exists.'], answer: 'no solution' };
    }

    if (coeffDiff !== 1) {
      steps.push(`Divide both sides by ${coeffDiff}`);
    }

    const answer = constDiff / coeffDiff;
    const answerStr = Number.isInteger(answer) ? String(answer) : String(Math.round(answer * 10000) / 10000);

    steps.push(`x = ${answerStr}`);

    return { steps, answer: answerStr };
  } catch (e) {
    return { steps: [`Could not solve: ${e.message}`], answer: 'Unknown' };
  }
}

/**
 * Parse a linear expression into {coeff, constant}.
 */
function _parseLinearExpr(expr) {
  expr = expr.replace(/\s+/g, '');

  let coeff = 0;
  let constant = 0;

  // Handle leading negative
  let normalized = expr;
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
      let coeffStr = term.replace('x', '');
      if (coeffStr === '' || coeffStr === '+') {
        coeff += 1;
      } else if (coeffStr === '-') {
        coeff += -1;
      } else {
        coeff += parseFloat(coeffStr);
      }
    } else {
      constant += parseFloat(term);
    }
  }

  return { coeff, constant };
}

/**
 * Solve geometry problems step by step.
 * Uses pattern matching for area/perimeter problems.
 */
function _solveGeometry(problem) {
  const lower = problem.toLowerCase();

  // Extract numbers from the problem
  const nums = (problem.match(/\d+\.?\d*/g) || []).map(Number);

  if (lower.includes('area') && lower.includes('rectangle')) {
    if (nums.length >= 2) {
      const area = nums[0] * nums[1];
      return {
        steps: [
          'Area of a rectangle = length \u00d7 width',
          `= ${nums[0]} \u00d7 ${nums[1]}`,
          `= ${area}`
        ],
        answer: String(area)
      };
    }
  }

  if (lower.includes('perimeter') && lower.includes('rectangle')) {
    if (nums.length >= 2) {
      const perimeter = 2 * (nums[0] + nums[1]);
      return {
        steps: [
          'Perimeter of a rectangle = 2 \u00d7 (length + width)',
          `= 2 \u00d7 (${nums[0]} + ${nums[1]})`,
          `= 2 \u00d7 ${nums[0] + nums[1]}`,
          `= ${perimeter}`
        ],
        answer: String(perimeter)
      };
    }
  }

  if (lower.includes('area') && lower.includes('triangle')) {
    if (nums.length >= 2) {
      const area = nums[0] * nums[1] / 2;
      const answerStr = Number.isInteger(area) ? String(area) : String(area);
      return {
        steps: [
          'Area of a triangle = (base \u00d7 height) \u00f7 2',
          `= (${nums[0]} \u00d7 ${nums[1]}) \u00f7 2`,
          `= ${nums[0] * nums[1]} \u00f7 2`,
          `= ${answerStr}`
        ],
        answer: answerStr
      };
    }
  }

  if (lower.includes('area') && lower.includes('circle')) {
    if (nums.length >= 1) {
      const area = Math.round(Math.PI * nums[0] * nums[0] * 100) / 100;
      return {
        steps: [
          'Area of a circle = \u03c0r\u00b2',
          `= \u03c0 \u00d7 ${nums[0]}\u00b2`,
          `= \u03c0 \u00d7 ${nums[0] * nums[0]}`,
          `= ${area}`
        ],
        answer: String(area)
      };
    }
  }

  if (lower.includes('circumference') && lower.includes('circle')) {
    if (nums.length >= 1) {
      const circ = Math.round(2 * Math.PI * nums[0] * 100) / 100;
      return {
        steps: [
          'Circumference = 2\u03c0r',
          `= 2 \u00d7 \u03c0 \u00d7 ${nums[0]}`,
          `= ${circ}`
        ],
        answer: String(circ)
      };
    }
  }

  if (lower.includes('volume') && (lower.includes('prism') || lower.includes('box'))) {
    if (nums.length >= 3) {
      const vol = nums[0] * nums[1] * nums[2];
      return {
        steps: [
          'Volume = length \u00d7 width \u00d7 height',
          `= ${nums[0]} \u00d7 ${nums[1]} \u00d7 ${nums[2]}`,
          `= ${vol}`
        ],
        answer: String(vol)
      };
    }
  }

  if (lower.includes('volume') && lower.includes('cylinder')) {
    if (nums.length >= 2) {
      const vol = Math.round(Math.PI * nums[0] * nums[0] * nums[1] * 100) / 100;
      return {
        steps: [
          'Volume of cylinder = \u03c0r\u00b2h',
          `= \u03c0 \u00d7 ${nums[0]}\u00b2 \u00d7 ${nums[1]}`,
          `= \u03c0 \u00d7 ${nums[0] * nums[0]} \u00d7 ${nums[1]}`,
          `= ${vol}`
        ],
        answer: String(vol)
      };
    }
  }

  if (lower.includes('volume') && lower.includes('cone')) {
    if (nums.length >= 2) {
      const vol = Math.round((1 / 3) * Math.PI * nums[0] * nums[0] * nums[1] * 100) / 100;
      return {
        steps: [
          'Volume of cone = (1/3)\u03c0r\u00b2h',
          `= (1/3) \u00d7 \u03c0 \u00d7 ${nums[0]}\u00b2 \u00d7 ${nums[1]}`,
          `= ${vol}`
        ],
        answer: String(vol)
      };
    }
  }

  if (lower.includes('volume') && lower.includes('sphere')) {
    if (nums.length >= 1) {
      const vol = Math.round((4 / 3) * Math.PI * Math.pow(nums[0], 3) * 100) / 100;
      return {
        steps: [
          'Volume of sphere = (4/3)\u03c0r\u00b3',
          `= (4/3) \u00d7 \u03c0 \u00d7 ${nums[0]}\u00b3`,
          `= ${vol}`
        ],
        answer: String(vol)
      };
    }
  }

  if (lower.includes('surface area') && lower.includes('sphere')) {
    if (nums.length >= 1) {
      const sa = Math.round(4 * Math.PI * nums[0] * nums[0] * 100) / 100;
      return {
        steps: [
          'Surface area of sphere = 4\u03c0r\u00b2',
          `= 4 \u00d7 \u03c0 \u00d7 ${nums[0]}\u00b2`,
          `= ${sa}`
        ],
        answer: String(sa)
      };
    }
  }

  if (lower.includes('pythagorean') || lower.includes('hypotenuse') || lower.includes('right triangle')) {
    if (nums.length >= 2) {
      const c = Math.round(Math.sqrt(nums[0] * nums[0] + nums[1] * nums[1]) * 100) / 100;
      return {
        steps: [
          'Using Pythagorean theorem: a\u00b2 + b\u00b2 = c\u00b2',
          `= ${nums[0]}\u00b2 + ${nums[1]}\u00b2`,
          `= ${nums[0] * nums[0]} + ${nums[1] * nums[1]}`,
          `= ${nums[0] * nums[0] + nums[1] * nums[1]}`,
          `c = \u221a${nums[0] * nums[0] + nums[1] * nums[1]} = ${c}`
        ],
        answer: String(c)
      };
    }
  }

  return { steps: ['Could not parse geometry problem.'], answer: 'Unknown' };
}

/**
 * Solve a quadratic equation step by step (without sympy).
 * Uses the quadratic formula.
 */
function _solveQuadratic(problem) {
  let eq = problem.replace(/Solve:/i, '').replace(/Solve for x:/i, '').trim();
  eq = eq.replace(/\u00b2/g, '^2');

  try {
    // Try to parse "ax^2 + bx + c = 0" or "ax^2 + bx + c = d"
    // First normalize: move everything to the left side
    let leftStr, rightStr;
    if (eq.indexOf('=') !== -1) {
      const sides = eq.split('=');
      leftStr = sides[0].trim();
      rightStr = sides[1].trim();
    } else {
      leftStr = eq;
      rightStr = '0';
    }

    // Parse coefficients from left side
    const coeffs = _parseQuadraticExpr(leftStr);
    const rightCoeffs = _parseQuadraticExpr(rightStr);

    const a = coeffs.a - rightCoeffs.a;
    const b = coeffs.b - rightCoeffs.b;
    const c = coeffs.c - rightCoeffs.c;

    const steps = [
      `Start with: ${eq}`,
      `Standard form: ${a}x\u00b2 + ${b}x + ${c} = 0`,
      `Using quadratic formula: x = (-b \u00b1 \u221a(b\u00b2-4ac)) / 2a`,
      `a = ${a}, b = ${b}, c = ${c}`
    ];

    const discriminant = b * b - 4 * a * c;
    steps.push(`Discriminant = b\u00b2 - 4ac = ${b}\u00b2 - 4(${a})(${c}) = ${discriminant}`);

    let answer;
    if (discriminant > 0) {
      const x1 = (-b + Math.sqrt(discriminant)) / (2 * a);
      const x2 = (-b - Math.sqrt(discriminant)) / (2 * a);
      const roots = [x1, x2].sort((a, b) => a - b);
      const r1 = _cleanNumber(roots[0]);
      const r2 = _cleanNumber(roots[1]);
      steps.push(`Two real solutions: x = ${r1}, x = ${r2}`);
      answer = `x = ${r1}, x = ${r2}`;
    } else if (discriminant === 0) {
      const x1 = -b / (2 * a);
      const r = _cleanNumber(x1);
      steps.push(`One repeated solution: x = ${r}`);
      answer = `x = ${r}`;
    } else {
      const real = -b / (2 * a);
      const imag = Math.sqrt(-discriminant) / (2 * a);
      const re = _cleanNumber(real);
      const im = _cleanNumber(imag);
      steps.push(`Two complex solutions: x = ${re} + ${im}i, x = ${re} - ${im}i`);
      answer = `x = ${re} + ${im}i, x = ${re} - ${im}i`;
    }

    return { steps, answer };
  } catch (e) {
    return { steps: [`Could not solve quadratic: ${e.message}`], answer: 'Unknown' };
  }
}

/**
 * Parse a quadratic expression into {a, b, c} coefficients of ax^2 + bx + c.
 */
function _parseQuadraticExpr(expr) {
  expr = expr.replace(/\s+/g, '');

  let a = 0, b = 0, c = 0;

  // Handle leading negative
  let normalized = expr;
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
    if (term.includes('x^2') || term.includes('x\u00b2')) {
      let coeff = term.replace('x^2', '').replace('x\u00b2', '');
      if (coeff === '' || coeff === '+') coeff = '1';
      if (coeff === '-') coeff = '-1';
      a += parseFloat(coeff);
    } else if (term.includes('x')) {
      let coeff = term.replace('x', '');
      if (coeff === '' || coeff === '+') coeff = '1';
      if (coeff === '-') coeff = '-1';
      b += parseFloat(coeff);
    } else if (term !== '') {
      c += parseFloat(term);
    }
  }

  return { a, b, c };
}

/**
 * Solve basic trig value problems step by step.
 */
function _solveTrig(problem) {
  const lower = problem.toLowerCase();
  const funcs = ['sin', 'cos', 'tan'];

  for (const func of funcs) {
    const regex = new RegExp(func + '\\s*\\(\\s*(\\d+)\\s*\\u00b0?\\s*\\)', 'i');
    const match = lower.match(regex);
    if (match) {
      const angle = parseInt(match[1], 10);
      const rad = angle * Math.PI / 180;
      let val;

      if (func === 'sin') {
        val = Math.round(Math.sin(rad) * 1000000) / 1000000;
      } else if (func === 'cos') {
        val = Math.round(Math.cos(rad) * 1000000) / 1000000;
      } else {
        if (angle % 180 === 90) {
          return { steps: [`${func}(${angle}\u00b0) is undefined`], answer: 'undefined' };
        }
        val = Math.round(Math.tan(rad) * 1000000) / 1000000;
      }

      const steps = [
        `Find ${func}(${angle}\u00b0)`,
        `Convert to radians: ${angle}\u00b0 = ${Math.round(rad * 10000) / 10000} radians`,
        `${func}(${angle}\u00b0) = ${val}`
      ];
      return { steps, answer: String(val) };
    }
  }

  return { steps: ['Could not parse trig problem.'], answer: 'Unknown' };
}

/**
 * Solve logarithm problems step by step.
 */
function _solveLogarithm(problem) {
  // Match log_base(argument) patterns: "log_2(8)", "log2(8)", "log_10(100)"
  const logMatch = problem.match(/log[_]?\s*(\d+)\s*\(\s*(\d+)\s*\)/);
  if (logMatch) {
    const base = parseInt(logMatch[1], 10);
    const arg = parseInt(logMatch[2], 10);
    let result = Math.log(arg) / Math.log(base);
    result = Math.round(result * 1000000) / 1000000;

    const steps = [
      `Evaluate log_${base}(${arg})`,
      `Ask: ${base} raised to what power equals ${arg}?`
    ];

    if (Number.isInteger(result)) {
      result = Math.round(result);
      steps.push(`${base}^${result} = ${arg}`);
      steps.push(`Answer: ${result}`);
    } else {
      steps.push(`log_${base}(${arg}) \u2248 ${result}`);
    }

    return { steps, answer: String(result) };
  }

  // Natural log: "ln(5)", "ln(2.718)"
  const lnMatch = problem.match(/ln\s*\(\s*(\d+\.?\d*)\s*\)/);
  if (lnMatch) {
    const arg = parseFloat(lnMatch[1]);
    const result = Math.round(Math.log(arg) * 1000000) / 1000000;
    const steps = [
      `Evaluate ln(${arg})`,
      `ln(${arg}) \u2248 ${result}`
    ];
    return { steps, answer: String(result) };
  }

  return { steps: ['Could not parse logarithm problem.'], answer: 'Unknown' };
}

/**
 * Clean a number: round to 4 decimal places and strip trailing zeros.
 */
function _cleanNumber(n) {
  const rounded = Math.round(n * 10000) / 10000;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded);
}

module.exports = {
  solveSteps,
  _solveArithmetic,
  _solveFraction,
  _solveEquation,
  _solveGeometry,
  _solveQuadratic,
  _solveTrig,
  _solveLogarithm
};
