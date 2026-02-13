/**
 * Statistics operations - mean, median, mode, range, std dev, probability, combinatorics.
 * Grades 6-12. All calculations are deterministic and done in code.
 */

/**
 * Calculate the mean (average) of a list of numbers.
 * Uses mathjs fractions for exact arithmetic.
 * @param {Array<number>} numbers
 * @returns {number}
 */
function mean(numbers) {
  if (!numbers || numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, n) => acc + n, 0);
  return sum / numbers.length;
}

/**
 * Calculate the median of a list of numbers.
 * @param {Array<number>} numbers
 * @returns {number}
 */
function median(numbers) {
  if (!numbers || numbers.length === 0) return 0;
  const sorted = numbers.slice().sort((a, b) => a - b);
  const n = sorted.length;
  if (n % 2 === 1) {
    return sorted[Math.floor(n / 2)];
  }
  return (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
}

/**
 * Calculate the mode of a list of numbers.
 * Returns the smallest mode if there are ties.
 * @param {Array<number>} numbers
 * @returns {number}
 */
function mode(numbers) {
  if (!numbers || numbers.length === 0) return 0;
  const counts = {};
  for (const n of numbers) {
    counts[n] = (counts[n] || 0) + 1;
  }
  const maxCount = Math.max(...Object.values(counts));
  const modes = Object.keys(counts)
    .filter(k => counts[k] === maxCount)
    .map(Number);
  return Math.min(...modes);
}

/**
 * Calculate the range of a list of numbers.
 * @param {Array<number>} numbers
 * @returns {number}
 */
function rangeOf(numbers) {
  if (!numbers || numbers.length === 0) return 0;
  return Math.max(...numbers) - Math.min(...numbers);
}

/**
 * Calculate the population standard deviation.
 * @param {Array<number>} numbers
 * @returns {number} rounded to 4 decimal places
 */
function standardDeviation(numbers) {
  if (!numbers || numbers.length < 2) return 0;
  const avg = numbers.reduce((acc, n) => acc + n, 0) / numbers.length;
  const variance = numbers.reduce((acc, n) => acc + Math.pow(n - avg, 2), 0) / numbers.length;
  return _round(Math.sqrt(variance), 4);
}

/**
 * Compute n! (factorial).
 * @param {number} n
 * @returns {number}
 */
function factorial(n) {
  if (n < 0) throw new Error('Factorial of negative number');
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

/**
 * Compute P(n, r) = n! / (n-r)! (permutations).
 * @param {number} n
 * @param {number} r
 * @returns {number}
 */
function permutation(n, r) {
  return Math.round(factorial(n) / factorial(n - r));
}

/**
 * Compute C(n, r) = n! / (r!(n-r)!) (combinations).
 * @param {number} n
 * @param {number} r
 * @returns {number}
 */
function combination(n, r) {
  return Math.round(factorial(n) / (factorial(r) * factorial(n - r)));
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
 * Simplify a fraction. Returns string like "1/2" or "3".
 */
function _simplifyFrac(num, den) {
  const g = _gcd(Math.abs(num), Math.abs(den));
  const n = num / g;
  const d = den / g;
  if (d === 1) return String(n);
  return `${n}/${d}`;
}

function _gcd(a, b) {
  while (b) { const t = b; b = a % b; a = t; }
  return a;
}

/**
 * Generate statistics problems (mean, median, mode, range).
 * @param {number} grade
 * @param {number} count
 * @returns {Array<Object>}
 */
function generateStatisticsProblems(grade, count) {
  if (count === undefined || count === null) count = 5;
  const problems = [];
  const statTypes = ['mean', 'median', 'mode', 'range'];

  for (let i = 0; i < count; i++) {
    const size = _randInt(5, 9);
    const maxVal = grade <= 6 ? 20 : 100;
    let data = [];
    for (let j = 0; j < size; j++) {
      data.push(_randInt(1, maxVal));
    }

    const dataStr = data.join(', ');
    const statType = _randChoice(statTypes);

    if (statType === 'mean') {
      const result = mean(data);
      let answer;
      if (Number.isInteger(result)) {
        answer = String(result);
      } else {
        answer = String(_round(result, 2));
      }
      problems.push({
        type: 'fill_in',
        question: `Find the mean (average) of: ${dataStr}`,
        answer: answer,
        hint: 'Add all the numbers together, then divide by how many numbers there are.'
      });
    } else if (statType === 'median') {
      const result = median(data);
      let answer;
      if (Number.isInteger(result)) {
        answer = String(result);
      } else {
        answer = String(_round(result, 1));
      }
      problems.push({
        type: 'fill_in',
        question: `Find the median of: ${dataStr}`,
        answer: answer,
        hint: 'First arrange the numbers in order, then find the middle value.'
      });
    } else if (statType === 'mode') {
      // Make sure there IS a clear mode by duplicating one element
      data.push(data[_randInt(0, data.length - 1)]);
      const newDataStr = data.join(', ');
      const result = mode(data);
      problems.push({
        type: 'fill_in',
        question: `Find the mode of: ${newDataStr}`,
        answer: String(result),
        hint: 'The mode is the number that appears most often.'
      });
    } else if (statType === 'range') {
      const result = rangeOf(data);
      problems.push({
        type: 'fill_in',
        question: `Find the range of: ${dataStr}`,
        answer: String(result),
        hint: 'Range = largest number - smallest number'
      });
    }
  }
  return problems;
}

/**
 * Generate advanced statistics problems (std dev, probability, combinations, permutations).
 * @param {number} grade
 * @param {number} count
 * @returns {Array<Object>}
 */
function generateAdvancedStatistics(grade, count) {
  if (count === undefined || count === null) count = 5;
  const problems = [];
  const probTypes = ['std_dev', 'probability', 'combination', 'permutation'];

  for (let i = 0; i < count; i++) {
    const probType = _randChoice(probTypes);

    if (probType === 'std_dev') {
      const size = _randInt(5, 7);
      const data = [];
      for (let j = 0; j < size; j++) {
        data.push(_randInt(10, 50));
      }
      const dataStr = data.join(', ');
      const sd = standardDeviation(data);
      problems.push({
        type: 'fill_in',
        question: `Find the population standard deviation of: ${dataStr}. Round to 4 decimal places.`,
        answer: String(sd),
        hint: 'First find the mean, then compute the average of squared deviations, then take the square root.'
      });
    } else if (probType === 'probability') {
      const total = _randChoice([6, 10, 12, 20, 52]);
      const favorable = _randInt(1, total - 1);
      const fracStr = _simplifyFrac(favorable, total);
      const scenarios = {
        6: `rolling a number less than ${favorable + 1} on a standard die`,
        10: `drawing one of ${favorable} specific items from a bag of ${total}`,
        12: `selecting one of ${favorable} months from the year`,
        20: `picking one of ${favorable} specific students from a class of ${total}`,
        52: `drawing one of ${favorable} specific cards from a standard deck`
      };
      problems.push({
        type: 'fill_in',
        question: `What is the probability of ${scenarios[total]}?`,
        answer: fracStr,
        hint: 'Probability = favorable outcomes / total outcomes'
      });
    } else if (probType === 'combination') {
      const n = _randInt(5, 10);
      const r = _randInt(2, Math.min(4, n));
      const answer = combination(n, r);
      problems.push({
        type: 'fill_in',
        question: `Calculate C(${n}, ${r}) (combinations of ${n} choose ${r}).`,
        answer: String(answer),
        hint: 'C(n,r) = n! / (r!(n-r)!). Order does not matter.'
      });
    } else {
      const n = _randInt(4, 8);
      const r = _randInt(2, Math.min(3, n));
      const answer = permutation(n, r);
      problems.push({
        type: 'fill_in',
        question: `Calculate P(${n}, ${r}) (permutations of ${n} taken ${r} at a time).`,
        answer: String(answer),
        hint: 'P(n,r) = n! / (n-r)!. Order matters.'
      });
    }
  }
  return problems;
}

module.exports = {
  mean,
  median,
  mode,
  rangeOf,
  standardDeviation,
  factorial,
  permutation,
  combination,
  generateStatisticsProblems,
  generateAdvancedStatistics
};
