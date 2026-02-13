/**
 * LearnQuest Math Engine - Node.js port
 *
 * Central module that exports all math engine components.
 * Math accuracy is critical: all computations are done in code (never by LLM).
 * Uses mathjs for fraction operations and safe expression evaluation.
 */

module.exports = {
  arithmetic: require('./arithmetic'),
  fractions: require('./fractions'),
  algebra: require('./algebra'),
  geometry: require('./geometry'),
  statistics: require('./statistics'),
  answerValidator: require('./answer-validator'),
  stepSolver: require('./step-solver'),
  problemGenerator: require('./problem-generator'),
  trigonometry: require('./trigonometry'),
  advancedAlgebra: require('./advanced-algebra')
};
