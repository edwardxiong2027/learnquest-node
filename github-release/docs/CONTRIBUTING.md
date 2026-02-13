# Contributing to LearnQuest

Thank you for your interest in contributing to LearnQuest! This project aims to provide free, offline, AI-powered tutoring for K-8 students. Every contribution helps make education more accessible.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [How to Contribute](#how-to-contribute)
3. [Development Setup](#development-setup)
4. [Project Structure](#project-structure)
5. [Coding Guidelines](#coding-guidelines)
6. [Submitting Changes](#submitting-changes)
7. [Reporting Bugs](#reporting-bugs)
8. [Requesting Features](#requesting-features)
9. [Curriculum Content](#curriculum-content)
10. [Testing](#testing)

---

## Code of Conduct

This project is used by children. Please keep all contributions, discussions, and interactions respectful, inclusive, and appropriate for an educational context.

- Be welcoming and inclusive.
- Be respectful of differing viewpoints and experiences.
- Accept constructive criticism gracefully.
- Focus on what is best for students and educators.

---

## How to Contribute

There are many ways to contribute:

- **Report bugs** -- Found something broken? Open an issue.
- **Fix bugs** -- Pick up an open issue and submit a pull request.
- **Add curriculum content** -- Help expand lessons, practice problems, or quizzes.
- **Improve the UI** -- Make the interface more accessible, intuitive, or visually appealing.
- **Write documentation** -- Help teachers and developers understand LearnQuest.
- **Test on different platforms** -- Verify LearnQuest works on your OS, browser, or hardware.
- **Translate** -- Help make LearnQuest available in other languages.
- **Spread the word** -- Tell teachers and schools about LearnQuest.

---

## Development Setup

### Prerequisites

- Node.js v18 or later
- Ollama with the Phi-3 model
- Git

### Getting Started

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/LearnQuest-Node.git
cd LearnQuest-Node

# Install dependencies
npm install

# Download the AI model (if not already downloaded)
ollama pull phi3

# Start in development mode (auto-restarts on file changes)
npm run dev
```

The development server runs at [http://localhost:5000](http://localhost:5000) with auto-reload on server-side changes.

### Running Tests

```bash
npm test
```

This runs the math engine test suite. All math functions must pass before submitting changes.

---

## Project Structure

```
LearnQuest-Node/
├── server.js                    # Express server entry point
├── package.json                 # Dependencies and scripts
├── src/
│   ├── database.js              # SQLite setup and helpers
│   ├── cache.js                 # LLM response caching
│   ├── ollama-client.js         # Ollama API wrapper with queuing
│   ├── utils.js                 # Shared utilities
│   ├── routes/                  # Express route handlers
│   │   ├── auth.js              # Login and registration
│   │   ├── curriculum.js        # Curriculum and lesson content
│   │   ├── tutor.js             # AI tutor chat
│   │   ├── quiz.js              # Quiz serving and grading
│   │   ├── progress.js          # XP, badges, streaks
│   │   ├── math.js              # Math validation endpoints
│   │   ├── teacher.js           # Teacher dashboard API
│   │   └── ...                  # Additional route files
│   └── math-engine/             # Deterministic math computation
│       ├── arithmetic.js        # Basic operations
│       ├── fractions.js         # Fraction operations
│       ├── algebra.js           # Equation solving
│       ├── geometry.js          # Area, perimeter, volume
│       ├── statistics.js        # Mean, median, mode, range
│       ├── problem-generator.js # Problem generation per grade
│       ├── answer-validator.js  # Answer equivalence checking
│       └── step-solver.js       # Step-by-step solutions
├── public/                      # Frontend (HTML, CSS, JS)
│   ├── css/styles.css           # All styles
│   ├── js/                      # Frontend JavaScript
│   └── images/                  # Icons, badges, avatars (SVG)
├── templates/
│   └── index.html               # SPA shell
├── content/                     # Curriculum JSON files
│   ├── math/                    # K-8 math curriculum
│   ├── science/                 # K-8 science curriculum
│   ├── ela/                     # K-8 ELA curriculum
│   ├── social_studies/          # K-8 social studies curriculum
│   └── curriculum_map.json      # Master curriculum tree
├── prompts/                     # LLM system prompts
├── database/
│   └── schema.sql               # Database schema
├── scripts/                     # Setup and launch scripts
└── docs/                        # Documentation
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for a detailed technical overview.

---

## Coding Guidelines

### General

- **Keep it simple.** No TypeScript, no React, no build tools. Plain Node.js + Express + vanilla HTML/CSS/JS. A teacher should be able to read and understand the code.
- **No external CDNs.** Everything must work offline. All dependencies are in `node_modules/` or bundled directly.
- **No frameworks on the frontend.** Vanilla JavaScript only.
- **Comment your code.** Explain the "why", not the "what."

### JavaScript Style

- Use `'use strict';` at the top of every file.
- Use `const` by default, `let` when reassignment is needed, never `var`.
- Use single quotes for strings.
- Use meaningful variable names.
- Keep functions small and focused.
- Handle errors explicitly -- do not swallow exceptions silently.

### Math Engine (Critical)

- **Never trust the LLM for computation.** All math answers must be computed deterministically using the math engine.
- **Always use mathjs** for mathematical operations.
- **Write tests** for every new math function. Math accuracy is the most important feature.
- **Test edge cases:** division by zero, negative numbers, very large numbers, equivalent forms (1/2 = 2/4 = 0.5).

### API Endpoints

- Follow REST conventions.
- Return JSON for all API responses.
- Include appropriate HTTP status codes.
- Validate all input on the server side.
- Keep the API contract stable -- the frontend depends on specific response shapes.

### CSS

- Use the established color scheme:
  - Primary blue: `#4A90D9`
  - Accent green: `#2ECC71`
  - Warm orange: `#F39C12`
  - Purple: `#9B59B6`
- Use system fonts (no external font loading).
- Ensure good contrast ratios for accessibility.
- Support both light and dark modes.
- Keep animations subtle and performant.

### Curriculum Content

- Align to Common Core standards where applicable.
- Use age-appropriate language for each grade level.
- Include real-world examples that students can relate to.
- Every lesson should have at least 5 practice problems.
- Include diverse representation in word problems (varied names, contexts, cultures).

---

## Submitting Changes

### Pull Request Process

1. **Fork** the repository and create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the coding guidelines above.

3. **Test your changes:**
   ```bash
   npm test                    # Run math engine tests
   npm start                   # Manual testing in the browser
   ```

4. **Commit with a clear message:**
   ```bash
   git commit -m "Add fraction simplification to step-solver

   The step-solver now shows intermediate simplification steps
   when solving fraction addition problems, making it easier
   for students to follow along."
   ```

5. **Push and create a pull request:**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then open a pull request on GitHub.

### Pull Request Guidelines

- Keep pull requests focused -- one feature or fix per PR.
- Include a clear description of what changed and why.
- If your PR changes the API, update the relevant documentation.
- If your PR adds new math functions, include tests.
- If your PR changes the UI, include a brief description of the visual changes.
- Reference any related issues (e.g., "Fixes #42").

---

## Reporting Bugs

Open an issue on [GitHub Issues](https://github.com/edwardxiong2027/LearnQuest-Node/issues) with:

1. **Title:** A short, clear description of the bug.
2. **Environment:** OS, Node.js version, browser, Ollama version.
3. **Steps to reproduce:** What you did to trigger the bug.
4. **Expected behavior:** What should have happened.
5. **Actual behavior:** What actually happened.
6. **Screenshots or logs:** If applicable.

### Math Accuracy Bugs (High Priority)

If you find a case where the math engine gives an incorrect answer, please report it immediately. Include:
- The exact problem (e.g., "3/4 + 1/2")
- The expected correct answer
- The answer LearnQuest gave
- The student's grade level and lesson context

---

## Requesting Features

Open an issue on [GitHub Issues](https://github.com/edwardxiong2027/LearnQuest-Node/issues) with:

1. **Title:** A short description of the feature.
2. **Use case:** Who would benefit and why.
3. **Description:** What the feature should do.
4. **Mockup:** If it involves UI changes, a rough sketch is helpful.

---

## Curriculum Content

We welcome contributions to the curriculum. Each subject has JSON files organized by grade in the `content/` directory.

### Adding New Lessons

1. Open the relevant JSON file (e.g., `content/math/3.json` for Grade 3 Math).
2. Add a new lesson object following the existing structure.
3. Include:
   - Clear explanation text
   - Worked examples
   - At least 5 practice problems
   - Key vocabulary
   - Real-world connections
4. Test by running LearnQuest and navigating to the new lesson.

### Content Review

All curriculum contributions are reviewed for:
- **Accuracy** -- Is the content factually correct?
- **Age-appropriateness** -- Is the language suitable for the grade level?
- **Alignment** -- Does it follow Common Core or equivalent standards?
- **Inclusivity** -- Are examples diverse and culturally sensitive?

---

## Testing

### Math Engine Tests

```bash
npm test
```

The test suite covers:
- Arithmetic operations (addition, subtraction, multiplication, division)
- Fraction operations (add, subtract, multiply, divide, simplify, compare)
- Algebra (solving linear equations, evaluating expressions)
- Geometry (area, perimeter, volume)
- Statistics (mean, median, mode, range)
- Answer validation (equivalent forms, tolerance)
- Edge cases (division by zero, overflow, negative numbers)

### Manual Testing Checklist

Before submitting a PR, verify:
- [ ] Server starts without errors (`npm start`)
- [ ] Login works for both teacher and student accounts
- [ ] Lessons load and display correctly
- [ ] Practice problems accept correct answers and reject incorrect ones
- [ ] AI tutor responds (requires Ollama running)
- [ ] XP and badges are awarded correctly
- [ ] Teacher dashboard shows accurate progress data
- [ ] The app works offline (after initial setup)

---

## Questions?

If you have questions about contributing, open a [discussion](https://github.com/edwardxiong2027/LearnQuest-Node/issues) or reach out through the project website at [learnquest2026.web.app](https://learnquest2026.web.app/).

Thank you for helping make education more accessible!
