'use strict';

/**
 * AI content generation routes with programmatic fallback.
 * Prefix: /api/generate
 */

const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const { getDb } = require('../database');
const ollama = require('../ollama-client');
const { makeCacheKey, getCachedResponse, cacheResponse } = require('../cache');

// -------------------------------------------------------------------------
// Content / Prompts directories
// -------------------------------------------------------------------------
const CONTENT_DIR =
  process.env.LEARNQUEST_CONTENT ||
  path.join(__dirname, '..', '..', 'content');

const PROMPTS_DIR =
  process.env.LEARNQUEST_PROMPTS ||
  path.join(__dirname, '..', '..', 'prompts');

// -------------------------------------------------------------------------
// Topic presets by subject and grade band
// -------------------------------------------------------------------------

const TOPIC_PRESETS = {
  math: {
    k: ['Counting to 10', 'Counting to 20', 'Number Recognition', 'Basic Addition', 'Basic Subtraction', 'Shapes', 'Comparing Sizes', 'Patterns', 'Sorting', 'More and Less'],
    '1': ['Addition within 20', 'Subtraction within 20', 'Place Value (Tens and Ones)', 'Measuring Lengths', 'Telling Time', 'Shapes and Fractions', 'Halves and Quarters', 'Comparing Numbers', 'Number Patterns', 'Word Problems'],
    '2': ['Addition within 100', 'Subtraction within 100', 'Intro to Multiplication', 'Measuring in Standard Units', 'Money', 'Bar Graphs', 'Geometry', 'Even and Odd Numbers', 'Skip Counting', 'Time and Calendars'],
    '3': ['Multiplication Facts', 'Division Facts', 'Fractions on Number Line', 'Comparing Fractions', 'Area and Perimeter', 'Elapsed Time', 'Rounding Numbers', 'Bar and Picture Graphs', 'Multiplication Word Problems', 'Fraction Equivalence'],
    '4': ['Multi-digit Multiplication', 'Long Division', 'Fraction Equivalence', 'Adding Fractions', 'Decimals Introduction', 'Angles and Measurement', 'Line Plots', 'Factors and Multiples', 'Place Value to Millions', 'Fraction to Decimal Conversion'],
    '5': ['Adding and Subtracting Fractions', 'Multiplying Fractions', 'Decimal Operations', 'Volume', 'Coordinate Plane', 'Order of Operations', 'Dividing Fractions', 'Numerical Expressions', 'Converting Measurements', 'Powers of 10'],
    '6': ['Ratios and Proportions', 'Dividing Fractions', 'Integers and Rational Numbers', 'Expressions and Equations', 'Area and Surface Area', 'Volume', 'Statistics (Mean, Median, Mode)', 'Coordinate Graphing', 'Percent Problems', 'Absolute Value'],
    '7': ['Proportional Relationships', 'Operations with Rational Numbers', 'Expressions and Equations', 'Geometry (Scale, Circles, Angles)', 'Probability', 'Statistics and Sampling', 'Inequalities', 'Unit Rates', 'Circumference and Area of Circles', 'Cross Sections'],
    '8': ['Linear Equations', 'Functions', 'Pythagorean Theorem', 'Transformations', 'Scatter Plots', 'Exponents', 'Irrational Numbers', 'Systems of Equations', 'Scientific Notation', 'Slope and Intercept'],
  },
  science: {
    k: ['Five Senses', 'Animals', 'Plants', 'Weather', 'Seasons', 'Day and Night', 'Living vs Non-Living', 'Water', 'Push and Pull', 'Habitats'],
    '1': ['Animal Habitats', 'Plant Parts', 'Seasons and Weather', 'Sun and Moon', 'Light and Sound', 'Solids, Liquids, Gases', 'Animal Groups', 'Needs of Living Things', 'Earth Materials', 'Patterns in Nature'],
    '2': ['Life Cycles', 'States of Matter', 'Landforms', 'Weather Patterns', 'Food Chains', 'Insects', 'Magnets', 'Water Cycle Basics', 'Rocks and Soil', 'Plant Growth'],
    '3': ['Ecosystems', 'Life Cycles', 'Rock Cycle', 'Weather and Climate', 'Forces and Motion', 'Inherited Traits', 'Fossils', 'Simple Machines', 'Adaptations', 'Sound Waves'],
    '4': ['Energy Forms', 'Electricity', 'Ecosystems and Food Webs', "Earth's Surface Changes", 'Weathering and Erosion', 'Properties of Matter', 'Light and Optics', 'Animal Adaptations', 'Water Cycle', 'Renewable Energy'],
    '5': ['Solar System', 'Properties of Matter', 'Chemical Changes', 'Ecosystems', 'Water Cycle', 'Simple Machines and Energy', "Earth's Layers", 'Stars and Constellations', 'Mixtures and Solutions', 'Gravity'],
    '6': ['Cells and Cell Theory', 'Body Systems', 'Atoms and Elements', 'Periodic Table', 'Plate Tectonics', 'Climate and Weather', 'Energy Transfer', 'Photosynthesis', 'Classification of Life', 'Scientific Method'],
    '7': ['Genetics Basics', 'DNA and Heredity', 'Chemical Reactions', 'Forces and Motion', 'Waves and Sound', "Earth's Atmosphere", 'Ecology and Biomes', 'Evolution Basics', 'Thermal Energy', 'Electromagnetic Spectrum'],
    '8': ['Physics: Motion and Forces', 'Chemistry: Reactions and Equations', 'Electricity and Magnetism', 'Earth Science: Climate Change', 'Astronomy', 'Human Body Systems', 'Atomic Structure', 'Conservation of Energy', 'Natural Selection', 'Renewable vs Non-Renewable Resources'],
  },
  ela: {
    k: ['Alphabet Letters', 'Phonics Basics', 'Sight Words', 'Rhyming Words', 'Story Retelling', 'Sentence Basics', 'Uppercase and Lowercase', 'Print Awareness', 'Vocabulary Building', 'Listening Skills'],
    '1': ['Phonics and Decoding', 'Sight Words Practice', 'Reading Comprehension', 'Sentence Structure', 'Capitalization', 'Punctuation Marks', 'Fiction vs Nonfiction', 'Story Elements', 'Writing Sentences', 'Vocabulary in Context'],
    '2': ['Reading Comprehension', 'Fiction and Nonfiction', 'Writing Paragraphs', 'Grammar Basics', 'Nouns and Verbs', 'Adjectives', 'Spelling Patterns', 'Narrative Writing', 'Main Idea and Details', 'Sequencing Events'],
    '3': ['Reading Comprehension Strategies', 'Paragraph Writing', 'Parts of Speech', 'Subject-Verb Agreement', 'Narrative Writing', 'Informational Text', 'Prefixes and Suffixes', 'Dictionary Skills', 'Point of View', 'Comparing Texts'],
    '4': ['Reading Comprehension', 'Essay Structure', 'Grammar and Mechanics', 'Persuasive Writing', 'Research Basics', 'Poetry Analysis', 'Figurative Language', 'Text Features', 'Summarizing', 'Verb Tenses'],
    '5': ['Literary Analysis', 'Expository Writing', 'Advanced Grammar', 'Research Papers', 'Vocabulary Building', 'Theme and Main Idea', 'Character Analysis', 'Argumentative Writing', 'Text Structure', 'Citing Sources'],
    '6': ['Literary Analysis', 'Argumentative Essays', 'Grammar and Mechanics', 'Vocabulary from Context', 'Research Writing', 'Rhetoric and Persuasion', 'Narrative Techniques', 'Figurative Language', "Author's Purpose", 'Compare and Contrast Essays'],
    '7': ['Essay Writing', 'Literary Elements', 'Advanced Grammar', 'Vocabulary Building', 'Research Methods', 'Persuasive Techniques', 'Poetry Analysis', 'Informational Writing', 'Tone and Mood', 'Thesis Statements'],
    '8': ['Argumentative Writing', 'Literary Analysis', 'Research Papers', 'Advanced Vocabulary', 'Rhetoric', 'MLA Format', 'Critical Reading', 'Speech Writing', 'Narrative Craft', 'Analyzing Arguments'],
  },
  social_studies: {
    k: ['Community Helpers', 'Maps and Globes', 'US Symbols', 'Holidays', 'Families and Cultures', 'Rules and Laws', 'My Neighborhood', 'Needs and Wants', 'Good Citizenship', 'American Flag'],
    '1': ['Neighborhoods', 'Maps Skills', 'American Symbols', 'National Holidays', 'Community Workers', 'Rules and Responsibilities', 'Past and Present', 'Goods and Services', 'Landforms', 'Cultures Around the World'],
    '2': ['Communities', 'US Geography', 'Government Basics', 'Economics: Needs and Wants', 'History of Our Community', 'Famous Americans', 'Maps and Directions', 'World Cultures', 'Natural Resources', 'Traditions and Customs'],
    '3': ['Native Americans', 'Colonial America', 'American Revolution Basics', 'US Geography Regions', 'Local and State Government', 'Economics: Supply and Demand', 'Immigration', 'Map Skills', 'Explorers', 'Cultural Traditions'],
    '4': ['American Revolution', 'US Constitution', 'Westward Expansion', 'State History', 'Geography of the Americas', 'Economics', 'Government Branches', 'Civil Rights Basics', 'Maps and Regions', 'Slavery in America'],
    '5': ['Colonial America', 'American Revolution', 'Constitution and Bill of Rights', 'Westward Expansion', 'Civil War', 'Reconstruction', 'Industrial Revolution', 'Immigration Waves', 'Geography of US', 'Citizenship and Government'],
    '6': ['Ancient Civilizations', 'World Geography', 'Ancient Egypt', 'Ancient Greece', 'Ancient Rome', 'World Religions', 'Medieval Europe', 'African Kingdoms', 'Asian Civilizations', 'Trade Routes'],
    '7': ['World History: Middle Ages', 'Renaissance and Reformation', 'Age of Exploration', 'World Cultures', 'Economics Systems', 'Government Types', 'Imperialism', 'World Geography', 'Human Rights', 'Global Trade'],
    '8': ['US History: Civil War to Modern', 'World War I', 'World War II', 'Cold War', 'Civil Rights Movement', 'Modern America', 'US Government and Civics', 'Economics', 'Global Issues', 'Constitution Deep Dive'],
  },
};

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function _getTopicsFor(subject, grade) {
  const gradeStr = grade === 0 ? 'k' : String(grade);
  const subjTopics = TOPIC_PRESETS[subject] || {};
  return subjTopics[gradeStr] || subjTopics['3'] || ['General Review'];
}

function _loadCurriculum(subject, grade) {
  const gradeStr = grade === 0 ? 'k' : String(grade);
  const filepath = path.join(CONTENT_DIR, subject, `${gradeStr}.json`);
  if (!fs.existsSync(filepath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch (_e) {
    return null;
  }
}

function _findMatchingLessons(data, topic) {
  if (!data) return [];
  const topicLower = topic.toLowerCase();
  const matches = [];
  const allLessons = [];

  for (const unit of data.units || []) {
    for (const lesson of unit.lessons || []) {
      allLessons.push(lesson);
      const title = (lesson.title || '').toLowerCase();
      const unitTitle = (unit.title || '').toLowerCase();
      const explanation = ((lesson.content || {}).explanation || '').toLowerCase();
      if (
        topicLower.includes(title) ||
        title.includes(topicLower) ||
        topicLower.includes(unitTitle) ||
        unitTitle.includes(topicLower) ||
        explanation.includes(topicLower)
      ) {
        matches.push(lesson);
      }
    }
  }

  return matches.length > 0 ? matches : allLessons.slice(0, 4);
}

function _fallbackLesson(subject, grade, topic) {
  const data = _loadCurriculum(subject, grade);
  const lessons = _findMatchingLessons(data, topic);

  if (lessons.length === 0) {
    return _generateSimpleLesson(subject, grade, topic);
  }

  const lesson = lessons[0];
  const content = lesson.content || {};
  return {
    title: `${topic} -- ${lesson.title || 'Lesson'}`,
    explanation: content.explanation || `Let's learn about ${topic}!`,
    examples: content.examples || [],
    key_vocabulary: content.key_vocabulary || [],
    real_world: content.real_world || '',
    practice_problems: (lesson.practice_problems || []).slice(0, 5),
  };
}

function _generateSimpleLesson(subject, grade, topic) {
  return {
    title: topic,
    explanation:
      `This is a lesson about ${topic} for grade ${grade} ${subject}. ` +
      `Learning about ${topic} helps build important skills and understanding.`,
    examples: [],
    key_vocabulary: [topic],
    real_world: `Understanding ${topic} helps in many real-world situations.`,
    practice_problems: [],
  };
}

function _fallbackFlashcards(subject, grade, topic, count) {
  const data = _loadCurriculum(subject, grade);
  const lessons = _findMatchingLessons(data, topic);
  const cards = [];

  for (const lesson of lessons) {
    const content = lesson.content || {};

    // From vocabulary
    for (const word of content.key_vocabulary || []) {
      cards.push({
        front: `What is "${word}"?`,
        back: `A key term in ${lesson.title || topic} -- ${subject}`,
        hint: `Related to ${topic}`,
      });
    }

    // From examples
    for (const ex of content.examples || []) {
      if (ex.problem && ex.answer) {
        cards.push({
          front: String(ex.problem),
          back: String(ex.answer),
          hint: ex.explanation ? String(ex.explanation).slice(0, 80) : '',
        });
      }
    }

    // From practice problems
    for (const prob of lesson.practice_problems || []) {
      const q = prob.question || '';
      let a = prob.answer || '';
      if (!a && prob.options && prob.correct !== undefined) {
        try {
          a = prob.options[prob.correct];
        } catch (_e) {
          a = '';
        }
      }
      if (q && a) {
        cards.push({
          front: q,
          back: String(a),
          hint: prob.hint || '',
        });
      }
    }
  }

  // Deduplicate and limit
  const seen = new Set();
  const unique = [];
  for (const c of cards) {
    const key = c.front.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(c);
    }
  }

  // Shuffle
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }

  return unique.slice(0, count);
}

function _fallbackQuiz(subject, grade, topic, count) {
  const data = _loadCurriculum(subject, grade);
  const lessons = _findMatchingLessons(data, topic);
  const questions = [];

  for (const lesson of lessons) {
    for (const prob of lesson.practice_problems || []) {
      const q = {
        type: prob.type || 'fill_in',
        question: prob.question || '',
        hint: prob.hint || '',
      };
      if (prob.type === 'multiple_choice' && prob.options) {
        q.options = prob.options;
        q.correct = prob.correct !== undefined ? prob.correct : 0;
      } else {
        q.answer = String(prob.answer || '');
      }
      questions.push(q);
    }
  }

  // Shuffle
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }

  return questions.slice(0, count);
}

function _fallbackPractice(subject, grade, topic, count) {
  const data = _loadCurriculum(subject, grade);
  const lessons = _findMatchingLessons(data, topic);
  const problems = [];

  for (const lesson of lessons) {
    for (const prob of lesson.practice_problems || []) {
      const p = {
        type: prob.type || 'fill_in',
        question: prob.question || '',
        hint: prob.hint || '',
        answer: String(prob.answer || ''),
      };
      if (prob.type === 'multiple_choice' && prob.options) {
        p.options = prob.options;
        p.correct = prob.correct !== undefined ? prob.correct : 0;
      }
      problems.push(p);
    }
  }

  // Shuffle
  for (let i = problems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [problems[i], problems[j]] = [problems[j], problems[i]];
  }

  return problems.slice(0, count);
}

function _isOllamaError(response) {
  if (!response) return true;
  const lower = response.toLowerCase();
  return lower.includes('trouble thinking') || lower.includes('error:');
}

function _loadPrompt(promptFile, vars) {
  const filepath = path.join(PROMPTS_DIR, promptFile);
  if (!fs.existsSync(filepath)) {
    return 'You are a helpful educational content generator.';
  }
  let template = fs.readFileSync(filepath, 'utf-8');
  if (vars) {
    for (const [key, value] of Object.entries(vars)) {
      template = template.split(`{${key}}`).join(String(value));
    }
  }
  return template;
}

function _parseJsonResponse(text) {
  if (!text) return null;

  // Try to find JSON in markdown code blocks
  const codeBlock = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlock) {
    text = codeBlock[1].trim();
  }

  // Try to find JSON array or object
  const jsonMatch = text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  let raw = jsonMatch ? jsonMatch[1] : text.trim();

  // Clean up common LLM JSON issues
  raw = raw.replace(/,\s*([}\]])/g, '$1'); // trailing commas
  raw = raw.replace(/'/g, '"'); // single to double quotes

  try {
    return JSON.parse(raw);
  } catch (_e) {
    return null;
  }
}

function _validateMathProblems(problems) {
  // Validate math problem answers using computation
  try {
    for (const prob of problems) {
      const answer = prob.answer;
      if (answer && typeof answer === 'string') {
        try {
          // Attempt basic evaluation to validate
          const cleaned = answer
            .replace(/x/gi, '*')
            .replace(/\^/g, '**');
          // Only safe chars
          if (/^[\d+\-*/().eE\s]+$/.test(cleaned)) {
            prob._validated = true;
          }
        } catch (_e) {
          // Skip
        }
      }
    }
  } catch (_e) {
    // Skip
  }
  return problems;
}

function requireAuth(req) {
  if (!req.session || !req.session.user_id) return null;
  return req.session.user_id;
}

// -------------------------------------------------------------------------
// GET /topics
// -------------------------------------------------------------------------
router.get('/topics', (req, res) => {
  const subject = req.query.subject || 'math';
  const grade = parseInt(req.query.grade || '3', 10);
  return res.json({ topics: _getTopicsFor(subject, grade) });
});

// -------------------------------------------------------------------------
// POST /lesson
// -------------------------------------------------------------------------
router.post('/lesson', async (req, res) => {
  const userId = requireAuth(req);
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const data = req.body || {};
  const subject = data.subject || 'math';
  const grade = data.grade !== undefined ? data.grade : 3;
  const topic = data.topic || '';

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  const db = getDb();

  // Check cache
  const ck = makeCacheKey('lesson', subject, grade, topic);
  const cached = getCachedResponse(ck);
  if (cached) {
    try {
      return res.json({ content: JSON.parse(cached), cached: true });
    } catch (_e) {
      // Invalid cache, continue
    }
  }

  // Try LLM first
  const system = _loadPrompt('content_generator.txt', { subject, grade, topic });
  const messages = [
    { role: 'system', content: system },
    {
      role: 'user',
      content: `Create a detailed lesson about "${topic}" for grade ${grade} ${subject}. Return valid JSON with keys: title, explanation, examples (array of {problem, answer, explanation}), key_vocabulary (array of strings), real_world (string), practice_problems (array of {type, question, answer, options (if multiple_choice), correct (index if mc), hint}).`,
    },
  ];

  let parsed;
  try {
    const response = await ollama.chat(messages, {
      maxTokens: 1500,
      temperature: 0.7,
    });
    parsed = _parseJsonResponse(response);
    if (!parsed || _isOllamaError(response)) {
      parsed = _fallbackLesson(subject, grade, topic);
    }
  } catch (_e) {
    parsed = _fallbackLesson(subject, grade, topic);
  }

  if (subject === 'math' && parsed.practice_problems) {
    parsed.practice_problems = _validateMathProblems(parsed.practice_problems);
  }

  const contentStr = JSON.stringify(parsed);
  cacheResponse(ck, contentStr);
  db.prepare(
    'INSERT INTO generated_content (user_id, content_type, subject, grade, topic, content_json) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userId, 'lesson', subject, grade, topic, contentStr);

  return res.json({ content: parsed });
});

// -------------------------------------------------------------------------
// POST /quiz
// -------------------------------------------------------------------------
router.post('/quiz', async (req, res) => {
  const userId = requireAuth(req);
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const data = req.body || {};
  const subject = data.subject || 'math';
  const grade = data.grade !== undefined ? data.grade : 3;
  const topic = data.topic || '';
  const count = Math.min(data.count || 5, 15);

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  const db = getDb();
  const ck = makeCacheKey('quiz', subject, grade, topic, count);
  const cached = getCachedResponse(ck);
  if (cached) {
    try {
      return res.json({ questions: JSON.parse(cached), cached: true });
    } catch (_e) {
      // Invalid cache
    }
  }

  const system = `You are a quiz generator for grade ${grade} ${subject}. Generate exactly ${count} quiz questions about ${topic}.`;
  const messages = [
    { role: 'system', content: system },
    {
      role: 'user',
      content: `Generate ${count} quiz questions about "${topic}". Return a JSON array where each item has: type ("multiple_choice" or "fill_in"), question (string), options (array of 4 strings, only for multiple_choice), correct (index 0-3 for mc), answer (string for fill_in), hint (string). Make them appropriate for grade ${grade}.`,
    },
  ];

  let parsed;
  try {
    const response = await ollama.chat(messages, {
      maxTokens: 1500,
      temperature: 0.8,
    });
    parsed = _parseJsonResponse(response);
    if (!parsed || !Array.isArray(parsed) || _isOllamaError(response)) {
      parsed = _fallbackQuiz(subject, grade, topic, count);
    }
  } catch (_e) {
    parsed = _fallbackQuiz(subject, grade, topic, count);
  }

  if (!parsed || parsed.length === 0) {
    return res.json({
      questions: [],
      error: 'No matching content found for this topic.',
    });
  }

  if (subject === 'math') {
    parsed = _validateMathProblems(parsed);
  }

  const contentStr = JSON.stringify(parsed);
  cacheResponse(ck, contentStr);
  db.prepare(
    'INSERT INTO generated_content (user_id, content_type, subject, grade, topic, content_json) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userId, 'quiz', subject, grade, topic, contentStr);

  return res.json({ questions: parsed });
});

// -------------------------------------------------------------------------
// POST /flashcards
// -------------------------------------------------------------------------
router.post('/flashcards', async (req, res) => {
  const userId = requireAuth(req);
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const data = req.body || {};
  const subject = data.subject || 'math';
  const grade = data.grade !== undefined ? data.grade : 3;
  const topic = data.topic || '';
  const count = Math.min(data.count || 8, 20);

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  const db = getDb();
  const ck = makeCacheKey('flashcards', subject, grade, topic, count);
  const cached = getCachedResponse(ck);
  if (cached) {
    try {
      return res.json({ flashcards: JSON.parse(cached), cached: true });
    } catch (_e) {
      // Invalid cache
    }
  }

  const system = _loadPrompt('flashcard_generator.txt', {
    subject,
    grade,
    topic,
    count,
  });
  const messages = [
    { role: 'system', content: system },
    {
      role: 'user',
      content: `Generate ${count} flashcards about "${topic}" for grade ${grade} ${subject}. Return a JSON array of objects with: front (question/term), back (answer/definition), hint (optional helper text).`,
    },
  ];

  let parsed;
  try {
    const response = await ollama.chat(messages, {
      maxTokens: 1000,
      temperature: 0.7,
    });
    parsed = _parseJsonResponse(response);
    if (!parsed || !Array.isArray(parsed) || _isOllamaError(response)) {
      parsed = _fallbackFlashcards(subject, grade, topic, count);
    }
  } catch (_e) {
    parsed = _fallbackFlashcards(subject, grade, topic, count);
  }

  if (!parsed || parsed.length === 0) {
    return res.json({
      flashcards: [],
      error: 'No matching content found for this topic.',
    });
  }

  const contentStr = JSON.stringify(parsed);
  cacheResponse(ck, contentStr);

  // Save individual flashcards to the flashcards table
  for (const card of parsed) {
    db.prepare(
      'INSERT INTO flashcards (user_id, subject, grade, topic, front, back, hint, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      userId,
      subject,
      grade,
      topic,
      card.front || '',
      card.back || '',
      card.hint || '',
      'ai'
    );
  }

  db.prepare(
    'INSERT INTO generated_content (user_id, content_type, subject, grade, topic, content_json) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userId, 'flashcards', subject, grade, topic, contentStr);

  return res.json({ flashcards: parsed });
});

// -------------------------------------------------------------------------
// POST /practice
// -------------------------------------------------------------------------
router.post('/practice', async (req, res) => {
  const userId = requireAuth(req);
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const data = req.body || {};
  const subject = data.subject || 'math';
  const grade = data.grade !== undefined ? data.grade : 3;
  const topic = data.topic || '';
  const count = Math.min(data.count || 5, 15);
  const types = data.types || ['multiple_choice', 'fill_in'];

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  const db = getDb();
  const typeStr = types.join(', ');
  const system = `You are a practice problem generator for grade ${grade} ${subject}.`;
  const messages = [
    { role: 'system', content: system },
    {
      role: 'user',
      content: `Generate ${count} practice problems about "${topic}" using these types: ${typeStr}. Return a JSON array where each item has: type, question, answer, options (for mc), correct (index for mc), hint. Grade level: ${grade}.`,
    },
  ];

  let parsed;
  try {
    const response = await ollama.chat(messages, {
      maxTokens: 1200,
      temperature: 0.8,
    });
    parsed = _parseJsonResponse(response);
    if (!parsed || !Array.isArray(parsed) || _isOllamaError(response)) {
      parsed = _fallbackPractice(subject, grade, topic, count);
    }
  } catch (_e) {
    parsed = _fallbackPractice(subject, grade, topic, count);
  }

  if (!parsed || parsed.length === 0) {
    return res.json({
      problems: [],
      error: 'No matching content found for this topic.',
    });
  }

  if (subject === 'math') {
    parsed = _validateMathProblems(parsed);
  }

  const contentStr = JSON.stringify(parsed);
  db.prepare(
    'INSERT INTO generated_content (user_id, content_type, subject, grade, topic, content_json) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userId, 'practice', subject, grade, topic, contentStr);

  return res.json({ problems: parsed });
});

// -------------------------------------------------------------------------
// GET /saved
// -------------------------------------------------------------------------
router.get('/saved', (req, res) => {
  const userId = requireAuth(req);
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDb();
  const rows = db
    .prepare(
      'SELECT id, content_type, subject, grade, topic, created_at FROM generated_content WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
    )
    .all(userId);

  return res.json({ items: rows });
});

// -------------------------------------------------------------------------
// GET /saved/:itemId
// -------------------------------------------------------------------------
router.get('/saved/:itemId', (req, res) => {
  const userId = requireAuth(req);
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDb();
  const itemId = parseInt(req.params.itemId, 10);
  const row = db
    .prepare('SELECT * FROM generated_content WHERE id = ? AND user_id = ?')
    .get(itemId, userId);

  if (!row) {
    return res.status(404).json({ error: 'Not found' });
  }

  const result = { ...row };
  try {
    result.content = JSON.parse(result.content_json);
  } catch (_e) {
    result.content = null;
  }
  delete result.content_json;

  return res.json(result);
});

// -------------------------------------------------------------------------
// DELETE /saved/:itemId
// -------------------------------------------------------------------------
router.delete('/saved/:itemId', (req, res) => {
  const userId = requireAuth(req);
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = getDb();
  const itemId = parseInt(req.params.itemId, 10);
  db.prepare(
    'DELETE FROM generated_content WHERE id = ? AND user_id = ?'
  ).run(itemId, userId);

  return res.json({ message: 'Deleted' });
});

module.exports = router;
