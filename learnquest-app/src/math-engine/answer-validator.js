/**
 * Answer validator - checks student answers against correct answers
 * with tolerance for equivalent forms.
 * E.g., "1/2" = "2/4" = "0.5" = ".5"
 * Uses mathjs for fraction/decimal comparisons.
 */

const math = require('mathjs');

/**
 * Check if a student's answer is equivalent to the correct answer.
 * Handles: integers, decimals, fractions, mixed numbers, percentages,
 *          pi expressions, sqrt expressions, complex numbers, vectors, intervals.
 * @param {string|number} studentAnswer
 * @param {string|number} correctAnswer
 * @returns {boolean}
 */
function validateAnswer(studentAnswer, correctAnswer) {
  const studentStr = String(studentAnswer).trim();
  const correctStr = String(correctAnswer).trim();

  // Direct string match (case-insensitive)
  if (studentStr.toLowerCase() === correctStr.toLowerCase()) {
    return true;
  }

  // Try numeric comparison
  try {
    const studentVal = _parseNumber(studentStr);
    const correctVal = _parseNumber(correctStr);

    if (studentVal !== null && correctVal !== null) {
      // Handle complex numbers separately
      if (typeof studentVal === 'object' && studentVal._isComplex) {
        if (typeof correctVal === 'object' && correctVal._isComplex) {
          return Math.abs(studentVal.re - correctVal.re) < 0.01 &&
                 Math.abs(studentVal.im - correctVal.im) < 0.01;
        }
        return false;
      }
      if (typeof correctVal === 'object' && correctVal._isComplex) {
        return false;
      }

      // Handle string-based comparisons (vectors, intervals)
      if (typeof studentVal === 'string' || typeof correctVal === 'string') {
        return studentStr.replace(/\s/g, '') === correctStr.replace(/\s/g, '');
      }

      // Try exact comparison using mathjs fractions
      try {
        const sf = math.fraction(studentVal);
        const cf = math.fraction(correctVal);
        if (sf.s * sf.n === cf.s * cf.n && sf.d === cf.d) {
          return true;
        }
      } catch (e) {
        // Fall through to floating point comparison
      }

      // Floating point tolerance for decimals
      const studentFloat = Number(studentVal);
      const correctFloat = Number(correctVal);
      if (!isNaN(studentFloat) && !isNaN(correctFloat)) {
        if (Math.abs(studentFloat - correctFloat) < 0.01) {
          return true;
        }
      }
    }
  } catch (e) {
    // If parsing fails, fall through
  }

  return false;
}

/**
 * Parse a string into a numeric value. Handles various formats:
 * - Integers: "42"
 * - Decimals: "3.14", ".5"
 * - Fractions: "3/4"
 * - Mixed numbers: "1 3/4"
 * - Percentages: "50%"
 * - Pi expressions: "4pi", "4\u03c0"
 * - Sqrt expressions: "sqrt(2)", "2sqrt(3)", "2sqrt(3)/4"
 * - Complex numbers: "3 + 2i", "3+2i"
 * - Vectors: "<3, 4>" (returned as string for comparison)
 * - Intervals: "(-2, 5]" (returned as string for comparison)
 * @param {string} s
 * @returns {number|string|object|null}
 */
function _parseNumber(s) {
  s = s.trim();

  if (!s) return null;

  // Remove commas in numbers (e.g., "1,000")
  s = s.replace(/,/g, '');

  // Handle percentage: "50%" -> 0.5
  if (s.endsWith('%')) {
    try {
      const val = parseFloat(s.slice(0, -1).trim());
      if (!isNaN(val)) return val / 100;
    } catch (e) {
      // fall through
    }
    return null;
  }

  // Handle mixed number: "1 3/4" or "-2 1/3"
  const mixedMatch = s.match(/^(-?\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const num = parseInt(mixedMatch[2], 10);
    const den = parseInt(mixedMatch[3], 10);
    if (den === 0) return null;
    const sign = whole < 0 ? -1 : 1;
    return (sign * (Math.abs(whole) * den + num)) / den;
  }

  // Handle fraction: "3/4" or "-3/4"
  const fracMatch = s.match(/^(-?\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1], 10);
    const den = parseInt(fracMatch[2], 10);
    if (den === 0) return null;
    return num / den;
  }

  // Handle decimal: "3.14", ".5", "-0.25"
  const decimalMatch = s.match(/^-?\d*\.?\d+$/);
  if (decimalMatch) {
    return parseFloat(s);
  }

  // Handle integer
  if (/^-?\d+$/.test(s)) {
    return parseInt(s, 10);
  }

  // Handle pi-based answers: "4pi", "4\u03c0", "pi/2", "\u03c0/2"
  const piMatch = s.match(/^(-?\d*\.?\d*)\s*[\u03c0]$|^(-?\d*\.?\d*)\s*pi$/i);
  if (piMatch) {
    let coeff = piMatch[1] || piMatch[2] || '';
    if (coeff === '' || coeff === '+') coeff = '1';
    if (coeff === '-') coeff = '-1';
    try {
      return parseFloat(coeff) * Math.PI;
    } catch (e) {
      return null;
    }
  }

  // Handle "pi/n" or "\u03c0/n"
  const piFracMatch = s.match(/^(-?\d*\.?\d*)\s*(?:pi|\u03c0)\s*\/\s*(\d+)$/i);
  if (piFracMatch) {
    let coeff = piFracMatch[1] || '';
    if (coeff === '' || coeff === '+') coeff = '1';
    if (coeff === '-') coeff = '-1';
    const den = parseInt(piFracMatch[2], 10);
    try {
      return (parseFloat(coeff) * Math.PI) / den;
    } catch (e) {
      return null;
    }
  }

  // Handle complex numbers: "3 + 2i", "3+2i", "-1 - 4i", "5i", "-3i"
  // Pure imaginary
  const pureImagMatch = s.match(/^(-?\d*\.?\d*)i$/);
  if (pureImagMatch) {
    let imag = pureImagMatch[1];
    if (imag === '' || imag === '+') imag = '1';
    if (imag === '-') imag = '-1';
    return { _isComplex: true, re: 0, im: parseFloat(imag) };
  }

  const complexMatch = s.match(/^(-?\d*\.?\d*)\s*([+-])\s*(\d*\.?\d*)i$/);
  if (complexMatch) {
    const real = complexMatch[1];
    const sign = complexMatch[2];
    let imag = complexMatch[3];
    try {
      const realVal = real !== '' ? parseFloat(real) : 0;
      if (imag === '') imag = '1';
      let imagVal = parseFloat(imag);
      if (sign === '-') imagVal = -imagVal;
      return { _isComplex: true, re: realVal, im: imagVal };
    } catch (e) {
      return null;
    }
  }

  // Handle sqrt expressions: "sqrt(2)", "2sqrt(3)", "2sqrt(3)/4"
  const sqrtMatch = s.match(/^(-?\d*\.?\d*)\s*sqrt\((\d+)\)(?:\s*\/\s*(\d+))?$/i);
  if (sqrtMatch) {
    let coeff = sqrtMatch[1];
    const radicand = parseInt(sqrtMatch[2], 10);
    const denom = sqrtMatch[3];
    try {
      if (coeff === '' || coeff === '+') coeff = '1';
      if (coeff === '-') coeff = '-1';
      let result = parseFloat(coeff) * Math.sqrt(radicand);
      if (denom) {
        result /= parseInt(denom, 10);
      }
      return result;
    } catch (e) {
      return null;
    }
  }

  // Handle vector notation: "<3, 4>"
  const vectorMatch = s.match(/^<\s*-?\d+\s*,\s*-?\d+\s*>$/);
  if (vectorMatch) {
    return s; // Return as-is for string comparison
  }

  // Handle interval notation: "(-2, 5]", "[1, 3)"
  const intervalMatch = s.match(/^[\[\(]-?\d+\.?\d*\s*,\s*-?\d+\.?\d*[\]\)]$/);
  if (intervalMatch) {
    return s; // Return as-is for string comparison
  }

  return null;
}

module.exports = {
  validateAnswer,
  _parseNumber  // exported for testing
};
