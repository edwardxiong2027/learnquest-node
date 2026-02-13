/**
 * Problem generator - creates grade-appropriate math problems with verified answers.
 * Dispatches to topic-specific generators. Central entry point for generating problems.
 */

const {
  generateAddition, generateSubtraction,
  generateMultiplication, generateDivision
} = require('./arithmetic');

const {
  generateFractionAddition, generateFractionSubtraction,
  generateFractionMultiply
} = require('./fractions');

const {
  generateLinearEquations, generateExpressionEvaluation
} = require('./algebra');

const {
  generateAreaPerimeter, generateVolume, generatePythagorean,
  generateCircleProblems, generate3dProblems
} = require('./geometry');

const {
  generateStatisticsProblems, generateAdvancedStatistics
} = require('./statistics');

const {
  generateUnitCircleProblems, generateRadianConversion,
  generateRightTriangleTrig
} = require('./trigonometry');

const {
  generateQuadraticProblems, generateSystemProblems,
  generatePolynomialProblems, generateComplexNumberProblems
} = require('./advanced-algebra');


/**
 * Map of topic names to their generator functions.
 * Each generator has the signature: (grade, count) => Array<Object>
 */
const TOPIC_GENERATORS = {
  'addition': generateAddition,
  'subtraction': generateSubtraction,
  'multiplication': generateMultiplication,
  'division': generateDivision,
  'fraction_addition': generateFractionAddition,
  'fraction_subtraction': generateFractionSubtraction,
  'fraction_multiplication': generateFractionMultiply,
  'linear_equations': generateLinearEquations,
  'expressions': generateExpressionEvaluation,
  'area_perimeter': generateAreaPerimeter,
  'volume': generateVolume,
  'statistics': generateStatisticsProblems,
  'advanced_statistics': generateAdvancedStatistics,
  'unit_circle': generateUnitCircleProblems,
  'radian_conversion': generateRadianConversion,
  'right_triangle_trig': generateRightTriangleTrig,
  'quadratics': generateQuadraticProblems,
  'systems': generateSystemProblems,
  'polynomials': generatePolynomialProblems,
  'complex_numbers': generateComplexNumberProblems,
  'circles': generateCircleProblems,
  '3d_geometry': generate3dProblems
};

/**
 * Map of common/alternate topic names to canonical names in TOPIC_GENERATORS.
 */
const topicMap = {
  'add': 'addition',
  'subtract': 'subtraction',
  'multiply': 'multiplication',
  'divide': 'division',
  'fractions': 'fraction_addition',
  'fraction_add': 'fraction_addition',
  'fraction_sub': 'fraction_subtraction',
  'fraction_mult': 'fraction_multiplication',
  'algebra': 'linear_equations',
  'equations': 'linear_equations',
  'geometry': 'area_perimeter',
  'area': 'area_perimeter',
  'perimeter': 'area_perimeter',
  'pythagorean': 'pythagorean',
  'stats': 'statistics',
  'mean': 'statistics',
  'median': 'statistics',
  'trig': 'unit_circle',
  'trigonometry': 'unit_circle',
  'sin': 'right_triangle_trig',
  'cos': 'right_triangle_trig',
  'tan': 'right_triangle_trig',
  'quadratic': 'quadratics',
  'factoring': 'quadratics',
  'system': 'systems',
  'systems_of_equations': 'systems',
  'polynomial': 'polynomials',
  'complex': 'complex_numbers',
  'circle': 'circles',
  'sphere': '3d_geometry',
  'cone': '3d_geometry',
  'cylinder': '3d_geometry',
  'standard_deviation': 'advanced_statistics',
  'probability': 'advanced_statistics',
  'combinations': 'advanced_statistics',
  'permutations': 'advanced_statistics'
};

/**
 * Generate math problems for a given topic and grade.
 * @param {string} topic - topic name (can use common aliases)
 * @param {number} grade - student grade level
 * @param {number} count - number of problems to generate
 * @returns {Array<Object>} array of problem objects
 */
function generateProblems(topic, grade, count) {
  if (count === undefined || count === null) count = 5;

  // Normalize topic name
  topic = topic.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');

  // Resolve aliases
  const resolvedTopic = topicMap[topic] || topic;

  // Special case: pythagorean doesn't need a grade parameter
  if (resolvedTopic === 'pythagorean') {
    return generatePythagorean(count);
  }

  // Look up the generator
  const generator = TOPIC_GENERATORS[resolvedTopic];
  if (!generator) {
    return _generateGradeMix(grade, count);
  }

  return generator(grade, count);
}

/**
 * Generate a mix of problems appropriate for the grade level.
 * Used as a fallback when the topic is not recognized.
 * @param {number} grade
 * @param {number} count
 * @returns {Array<Object>}
 */
function _generateGradeMix(grade, count) {
  let topics;

  if (grade <= 2) {
    topics = ['addition', 'subtraction'];
  } else if (grade <= 4) {
    topics = ['addition', 'subtraction', 'multiplication', 'division'];
  } else if (grade <= 5) {
    topics = ['multiplication', 'division', 'fraction_addition', 'area_perimeter'];
  } else if (grade <= 6) {
    topics = ['fraction_addition', 'fraction_multiplication', 'linear_equations', 'area_perimeter'];
  } else if (grade <= 8) {
    topics = ['linear_equations', 'expressions', 'statistics', 'area_perimeter'];
  } else if (grade === 9) {
    topics = ['linear_equations', 'quadratics', 'systems', 'polynomials'];
  } else if (grade === 10) {
    topics = ['right_triangle_trig', 'circles', 'area_perimeter', '3d_geometry'];
  } else if (grade === 11) {
    topics = ['quadratics', 'unit_circle', 'advanced_statistics'];
  } else {
    // grade 12+
    topics = ['advanced_statistics', 'complex_numbers', 'systems'];
  }

  const problems = [];
  const perTopic = Math.max(1, Math.floor(count / topics.length));

  for (const topicName of topics) {
    const gen = TOPIC_GENERATORS[topicName];
    if (gen) {
      problems.push(...gen(grade, perTopic));
    }
  }

  // Shuffle
  for (let i = problems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [problems[i], problems[j]] = [problems[j], problems[i]];
  }

  return problems.slice(0, count);
}

module.exports = {
  generateProblems,
  TOPIC_GENERATORS,
  topicMap,
  _generateGradeMix
};
