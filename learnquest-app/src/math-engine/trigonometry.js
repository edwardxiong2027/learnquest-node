/**
 * Trigonometry operations - sin, cos, tan, unit circle, law of sines/cosines.
 * Grades 10-12. All computations done deterministically.
 */

/**
 * Unit circle: exact trig values for standard angles.
 * Values are strings for exact radical forms, or numbers for exact rationals.
 */
const UNIT_CIRCLE = {
  0:   { sin: 0,             cos: 1,              tan: 0 },
  30:  { sin: '1/2',         cos: 'sqrt(3)/2',    tan: 'sqrt(3)/3' },
  45:  { sin: 'sqrt(2)/2',   cos: 'sqrt(2)/2',    tan: 1 },
  60:  { sin: 'sqrt(3)/2',   cos: '1/2',          tan: 'sqrt(3)' },
  90:  { sin: 1,             cos: 0,              tan: 'undefined' },
  120: { sin: 'sqrt(3)/2',   cos: '-1/2',         tan: '-sqrt(3)' },
  135: { sin: 'sqrt(2)/2',   cos: '-sqrt(2)/2',   tan: -1 },
  150: { sin: '1/2',         cos: '-sqrt(3)/2',   tan: '-sqrt(3)/3' },
  180: { sin: 0,             cos: -1,             tan: 0 },
  210: { sin: '-1/2',        cos: '-sqrt(3)/2',   tan: 'sqrt(3)/3' },
  225: { sin: '-sqrt(2)/2',  cos: '-sqrt(2)/2',   tan: 1 },
  240: { sin: '-sqrt(3)/2',  cos: '-1/2',         tan: 'sqrt(3)' },
  270: { sin: -1,            cos: 0,              tan: 'undefined' },
  300: { sin: '-sqrt(3)/2',  cos: '1/2',          tan: '-sqrt(3)' },
  315: { sin: '-sqrt(2)/2',  cos: 'sqrt(2)/2',    tan: -1 },
  330: { sin: '-1/2',        cos: 'sqrt(3)/2',    tan: '-sqrt(3)/3' },
  360: { sin: 0,             cos: 1,              tan: 0 }
};

/**
 * Convert degrees to a fraction of pi (as a simplified fraction string).
 * E.g., 90 -> {n: 1, d: 2} meaning pi/2
 * @param {number} degrees
 * @returns {{n: number, d: number}} fraction of pi
 */
function degreesToRadians(degrees) {
  // degrees / 180 * pi -> fraction is degrees/180
  const g = _gcd(Math.abs(degrees), 180);
  return { n: degrees / g, d: 180 / g };
}

/**
 * Convert a fraction-of-pi radians to degrees.
 * @param {{n: number, d: number}} radFrac - e.g., {n: 1, d: 2} for pi/2
 * @returns {number} degrees
 */
function radiansToDegrees(radFrac) {
  return (radFrac.n / radFrac.d) * 180;
}

/**
 * Get the trig value for a standard angle.
 * Returns the exact string/number from the unit circle, or a computed decimal.
 * @param {string} func - 'sin', 'cos', or 'tan'
 * @param {number} angleDeg
 * @returns {string|number}
 */
function trigValue(func, angleDeg) {
  // Normalize angle to [0, 360)
  angleDeg = ((angleDeg % 360) + 360) % 360;
  if (UNIT_CIRCLE[angleDeg]) {
    const val = UNIT_CIRCLE[angleDeg][func];
    return val !== undefined ? val : 'unknown';
  }
  // Compute numerically for non-standard angles
  const rad = angleDeg * Math.PI / 180;
  if (func === 'sin') return _round(Math.sin(rad), 4);
  if (func === 'cos') return _round(Math.cos(rad), 4);
  if (func === 'tan') {
    if (Math.abs(Math.cos(rad)) < 1e-10) return 'undefined';
    return _round(Math.tan(rad), 4);
  }
  return 'unknown';
}

/**
 * Find side c using the law of cosines: c^2 = a^2 + b^2 - 2ab*cos(C).
 * @param {number} a - side a
 * @param {number} b - side b
 * @param {number} angleCDeg - angle C in degrees
 * @returns {number} side c, rounded to 2 decimals
 */
function lawOfCosinesSide(a, b, angleCDeg) {
  const C = angleCDeg * Math.PI / 180;
  const cSquared = a * a + b * b - 2 * a * b * Math.cos(C);
  return _round(Math.sqrt(cSquared), 2);
}

/**
 * Find angle B using the law of sines: sin(B)/b = sin(A)/a.
 * @param {number} a - side a
 * @param {number} angleADeg - angle A in degrees
 * @param {number} b - side b
 * @returns {number|null} angle B in degrees, or null if impossible
 */
function lawOfSinesAngle(a, angleADeg, b) {
  const A = angleADeg * Math.PI / 180;
  const sinB = b * Math.sin(A) / a;
  if (Math.abs(sinB) > 1) return null;
  return _round(Math.asin(sinB) * 180 / Math.PI, 2);
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

function _gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) { const t = b; b = a % b; a = t; }
  return a;
}

/**
 * Generate unit circle / trig value problems.
 * @param {number} grade
 * @param {number} count
 * @returns {Array<Object>}
 */
function generateUnitCircleProblems(grade, count) {
  if (count === undefined || count === null) count = 5;
  const problems = [];
  const commonAngles = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
  const funcs = ['sin', 'cos', 'tan'];

  for (let i = 0; i < count; i++) {
    const angle = _randChoice(commonAngles);
    const func = _randChoice(funcs);
    const val = UNIT_CIRCLE[angle] ? UNIT_CIRCLE[angle][func] : 'unknown';
    const answer = String(val);

    problems.push({
      type: 'fill_in',
      question: `What is ${func}(${angle}\u00b0)?`,
      answer: answer,
      hint: `Think about the unit circle. What are the coordinates at ${angle}\u00b0?`
    });
  }
  return problems;
}

/**
 * Generate degree-radian conversion problems.
 * @param {number} grade
 * @param {number} count
 * @returns {Array<Object>}
 */
function generateRadianConversion(grade, count) {
  if (count === undefined || count === null) count = 5;
  const problems = [];
  const angles = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330, 360];

  for (let i = 0; i < count; i++) {
    const angle = _randChoice(angles);

    if (Math.random() > 0.5) {
      // Degrees -> Radians
      const rad = degreesToRadians(angle);
      let answer;
      if (angle === 0) {
        answer = '0';
      } else if (rad.d === 1) {
        answer = `${rad.n}pi`;
      } else {
        answer = `${rad.n}pi/${rad.d}`;
      }
      problems.push({
        type: 'fill_in',
        question: `Convert ${angle}\u00b0 to radians.`,
        answer: answer,
        hint: 'Multiply the degree measure by \u03c0/180 and simplify.'
      });
    } else {
      // Radians -> Degrees
      const rad = degreesToRadians(angle);
      let radStr;
      if (angle === 0) {
        radStr = '0';
      } else if (rad.d === 1) {
        radStr = `${rad.n}\u03c0`;
      } else {
        radStr = `${rad.n}\u03c0/${rad.d}`;
      }
      problems.push({
        type: 'fill_in',
        question: `Convert ${radStr} radians to degrees.`,
        answer: String(angle),
        hint: 'Multiply the radian measure by 180/\u03c0.'
      });
    }
  }
  return problems;
}

/**
 * Generate SOH-CAH-TOA problems with right triangles.
 * @param {number} grade
 * @param {number} count
 * @returns {Array<Object>}
 */
function generateRightTriangleTrig(grade, count) {
  if (count === undefined || count === null) count = 5;
  const problems = [];
  const triples = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [6, 8, 10], [7, 24, 25]];

  for (let i = 0; i < count; i++) {
    const triple = _randChoice(triples);
    const a = triple[0], b = triple[1], c = triple[2];
    const func = _randChoice(['sin', 'cos', 'tan']);

    if (func === 'sin') {
      const answer = `${a}/${c}`;
      problems.push({
        type: 'fill_in',
        question: `In a right triangle with opposite side ${a} and hypotenuse ${c}, what is sin(\u03b8)?`,
        answer: answer,
        hint: 'SOH: Sin = Opposite / Hypotenuse'
      });
    } else if (func === 'cos') {
      const answer = `${b}/${c}`;
      problems.push({
        type: 'fill_in',
        question: `In a right triangle with adjacent side ${b} and hypotenuse ${c}, what is cos(\u03b8)?`,
        answer: answer,
        hint: 'CAH: Cos = Adjacent / Hypotenuse'
      });
    } else {
      const answer = `${a}/${b}`;
      problems.push({
        type: 'fill_in',
        question: `In a right triangle with opposite side ${a} and adjacent side ${b}, what is tan(\u03b8)?`,
        answer: answer,
        hint: 'TOA: Tan = Opposite / Adjacent'
      });
    }
  }
  return problems;
}

module.exports = {
  UNIT_CIRCLE,
  degreesToRadians,
  radiansToDegrees,
  trigValue,
  lawOfCosinesSide,
  lawOfSinesAngle,
  generateUnitCircleProblems,
  generateRadianConversion,
  generateRightTriangleTrig
};
