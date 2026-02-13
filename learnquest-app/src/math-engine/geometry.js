/**
 * Geometry operations - area, perimeter, volume for basic and advanced shapes (K-12).
 * All computations done deterministically in code.
 */

/**
 * Area of a rectangle.
 * @param {number} length
 * @param {number} width
 * @returns {number}
 */
function areaRectangle(length, width) {
  return length * width;
}

/**
 * Perimeter of a rectangle.
 * @param {number} length
 * @param {number} width
 * @returns {number}
 */
function perimeterRectangle(length, width) {
  return 2 * (length + width);
}

/**
 * Area of a triangle.
 * @param {number} base
 * @param {number} height
 * @returns {number}
 */
function areaTriangle(base, height) {
  return 0.5 * base * height;
}

/**
 * Area of a circle.
 * @param {number} radius
 * @returns {number}
 */
function areaCircle(radius) {
  return Math.PI * radius * radius;
}

/**
 * Circumference of a circle.
 * @param {number} radius
 * @returns {number}
 */
function circumferenceCircle(radius) {
  return 2 * Math.PI * radius;
}

/**
 * Volume of a rectangular prism (box).
 * @param {number} length
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
function volumeRectangularPrism(length, width, height) {
  return length * width * height;
}

/**
 * Volume of a cylinder.
 * @param {number} radius
 * @param {number} height
 * @returns {number}
 */
function volumeCylinder(radius, height) {
  return Math.PI * radius * radius * height;
}

/**
 * Surface area of a rectangular prism.
 * @param {number} length
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
function surfaceAreaRectangularPrism(length, width, height) {
  return 2 * (length * width + width * height + length * height);
}

/**
 * Find a missing side of a right triangle using the Pythagorean theorem.
 * Pass null for the unknown side.
 * @param {number|null} a - leg a
 * @param {number|null} b - leg b
 * @param {number|null} c - hypotenuse
 * @returns {number} the missing side
 */
function pythagorean(a, b, c) {
  if (c === null || c === undefined) {
    return Math.sqrt(a * a + b * b);
  } else if (a === null || a === undefined) {
    return Math.sqrt(c * c - b * b);
  } else if (b === null || b === undefined) {
    return Math.sqrt(c * c - a * a);
  }
  throw new Error('Exactly one parameter must be null/undefined');
}

/**
 * Volume of a cone.
 * @param {number} radius
 * @param {number} height
 * @returns {number}
 */
function volumeCone(radius, height) {
  return (1 / 3) * Math.PI * radius * radius * height;
}

/**
 * Volume of a sphere.
 * @param {number} radius
 * @returns {number}
 */
function volumeSphere(radius) {
  return (4 / 3) * Math.PI * radius * radius * radius;
}

/**
 * Surface area of a sphere.
 * @param {number} radius
 * @returns {number}
 */
function surfaceAreaSphere(radius) {
  return 4 * Math.PI * radius * radius;
}

/**
 * Area of a circular sector.
 * @param {number} radius
 * @param {number} angleDeg - central angle in degrees
 * @returns {number}
 */
function areaCircleSector(radius, angleDeg) {
  return (angleDeg / 360) * Math.PI * radius * radius;
}

/**
 * Arc length of a circular sector.
 * @param {number} radius
 * @param {number} angleDeg - central angle in degrees
 * @returns {number}
 */
function arcLength(radius, angleDeg) {
  return (angleDeg / 360) * 2 * Math.PI * radius;
}

// --- Random helpers ---

function _randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate area/perimeter problems for rectangles, squares, triangles.
 * @param {number} grade
 * @param {number} count
 * @returns {Array<Object>}
 */
function generateAreaPerimeter(grade, count) {
  if (count === undefined || count === null) count = 5;
  const problems = [];
  const shapes = ['rectangle', 'square', 'triangle'];

  for (let i = 0; i < count; i++) {
    const shape = shapes[_randInt(0, shapes.length - 1)];

    if (shape === 'rectangle') {
      const l = _randInt(2, 15);
      const w = _randInt(2, 15);
      if (Math.random() > 0.5) {
        const answer = l * w;
        problems.push({
          type: 'fill_in',
          question: `What is the area of a rectangle with length ${l} and width ${w}?`,
          answer: String(answer),
          hint: 'Area of a rectangle = length \u00d7 width'
        });
      } else {
        const answer = 2 * (l + w);
        problems.push({
          type: 'fill_in',
          question: `What is the perimeter of a rectangle with length ${l} and width ${w}?`,
          answer: String(answer),
          hint: 'Perimeter = 2 \u00d7 (length + width)'
        });
      }
    } else if (shape === 'square') {
      const s = _randInt(2, 15);
      if (Math.random() > 0.5) {
        const answer = s * s;
        problems.push({
          type: 'fill_in',
          question: `What is the area of a square with side length ${s}?`,
          answer: String(answer),
          hint: 'Area of a square = side \u00d7 side'
        });
      } else {
        const answer = 4 * s;
        problems.push({
          type: 'fill_in',
          question: `What is the perimeter of a square with side length ${s}?`,
          answer: String(answer),
          hint: 'Perimeter of a square = 4 \u00d7 side'
        });
      }
    } else if (shape === 'triangle') {
      const base = _randInt(2, 15);
      const height = _randInt(2, 15);
      const area = base * height / 2;
      const answer = (area === Math.floor(area)) ? String(Math.floor(area)) : String(area);
      problems.push({
        type: 'fill_in',
        question: `What is the area of a triangle with base ${base} and height ${height}?`,
        answer: answer,
        hint: 'Area of a triangle = (base \u00d7 height) \u00f7 2'
      });
    }
  }

  return problems;
}

/**
 * Generate volume problems for rectangular prisms (grades 5+).
 * @param {number} grade
 * @param {number} count
 * @returns {Array<Object>}
 */
function generateVolume(grade, count) {
  if (count === undefined || count === null) count = 5;
  const problems = [];

  for (let i = 0; i < count; i++) {
    const l = _randInt(2, 10);
    const w = _randInt(2, 10);
    const h = _randInt(2, 10);
    const vol = l * w * h;
    problems.push({
      type: 'fill_in',
      question: `What is the volume of a rectangular prism with length ${l}, width ${w}, and height ${h}?`,
      answer: String(vol),
      hint: 'Volume = length \u00d7 width \u00d7 height'
    });
  }
  return problems;
}

/**
 * Generate Pythagorean theorem problems (grade 8+).
 * Uses known Pythagorean triples for clean integer answers.
 * @param {number} count
 * @returns {Array<Object>}
 */
function generatePythagorean(count) {
  if (count === undefined || count === null) count = 5;
  const triples = [
    [3, 4, 5], [5, 12, 13], [8, 15, 17],
    [6, 8, 10], [9, 12, 15], [7, 24, 25]
  ];
  const problems = [];

  for (let i = 0; i < count; i++) {
    const triple = triples[_randInt(0, triples.length - 1)];
    const a = triple[0], b = triple[1], c = triple[2];
    const which = ['c', 'a', 'b'][_randInt(0, 2)];

    if (which === 'c') {
      problems.push({
        type: 'fill_in',
        question: `A right triangle has legs of length ${a} and ${b}. What is the length of the hypotenuse?`,
        answer: String(c),
        hint: 'Use the Pythagorean theorem: a\u00b2 + b\u00b2 = c\u00b2'
      });
    } else if (which === 'a') {
      problems.push({
        type: 'fill_in',
        question: `A right triangle has one leg of ${b} and hypotenuse of ${c}. What is the other leg?`,
        answer: String(a),
        hint: 'Rearrange: a\u00b2 = c\u00b2 - b\u00b2'
      });
    } else {
      problems.push({
        type: 'fill_in',
        question: `A right triangle has one leg of ${a} and hypotenuse of ${c}. What is the other leg?`,
        answer: String(b),
        hint: 'Rearrange: b\u00b2 = c\u00b2 - a\u00b2'
      });
    }
  }
  return problems;
}

/**
 * Generate circle geometry problems (area, circumference, arc length, sector area).
 * @param {number} grade
 * @param {number} count
 * @returns {Array<Object>}
 */
function generateCircleProblems(grade, count) {
  if (count === undefined || count === null) count = 5;
  const problems = [];
  const probTypes = ['area', 'circumference', 'arc_length', 'sector_area'];

  for (let i = 0; i < count; i++) {
    const r = _randInt(2, 10);
    const prob = probTypes[_randInt(0, probTypes.length - 1)];

    if (prob === 'area') {
      const answer = _round(Math.PI * r * r, 2);
      problems.push({
        type: 'fill_in',
        question: `Find the area of a circle with radius ${r}. Round to 2 decimal places.`,
        answer: String(answer),
        hint: 'Area = \u03c0r\u00b2'
      });
    } else if (prob === 'circumference') {
      const answer = _round(2 * Math.PI * r, 2);
      problems.push({
        type: 'fill_in',
        question: `Find the circumference of a circle with radius ${r}. Round to 2 decimal places.`,
        answer: String(answer),
        hint: 'Circumference = 2\u03c0r'
      });
    } else if (prob === 'arc_length') {
      const angle = [30, 45, 60, 90, 120, 180][_randInt(0, 5)];
      const answer = _round(arcLength(r, angle), 2);
      problems.push({
        type: 'fill_in',
        question: `Find the arc length of a sector with radius ${r} and central angle ${angle}\u00b0. Round to 2 decimal places.`,
        answer: String(answer),
        hint: 'Arc length = (angle/360) \u00d7 2\u03c0r'
      });
    } else {
      const angle = [30, 45, 60, 90, 120, 180][_randInt(0, 5)];
      const answer = _round(areaCircleSector(r, angle), 2);
      problems.push({
        type: 'fill_in',
        question: `Find the area of a sector with radius ${r} and central angle ${angle}\u00b0. Round to 2 decimal places.`,
        answer: String(answer),
        hint: 'Sector area = (angle/360) \u00d7 \u03c0r\u00b2'
      });
    }
  }
  return problems;
}

/**
 * Generate 3D volume/surface area problems (cone, sphere, cylinder).
 * @param {number} grade
 * @param {number} count
 * @returns {Array<Object>}
 */
function generate3dProblems(grade, count) {
  if (count === undefined || count === null) count = 5;
  const problems = [];
  const shapes = ['cone', 'sphere', 'cylinder'];

  for (let i = 0; i < count; i++) {
    const shape = shapes[_randInt(0, shapes.length - 1)];

    if (shape === 'cone') {
      const r = _randInt(2, 8);
      const h = _randInt(3, 12);
      const vol = _round(volumeCone(r, h), 2);
      problems.push({
        type: 'fill_in',
        question: `Find the volume of a cone with radius ${r} and height ${h}. Round to 2 decimal places.`,
        answer: String(vol),
        hint: 'Volume of cone = (1/3)\u03c0r\u00b2h'
      });
    } else if (shape === 'sphere') {
      const r = _randInt(2, 8);
      if (Math.random() > 0.5) {
        const vol = _round(volumeSphere(r), 2);
        problems.push({
          type: 'fill_in',
          question: `Find the volume of a sphere with radius ${r}. Round to 2 decimal places.`,
          answer: String(vol),
          hint: 'Volume of sphere = (4/3)\u03c0r\u00b3'
        });
      } else {
        const sa = _round(surfaceAreaSphere(r), 2);
        problems.push({
          type: 'fill_in',
          question: `Find the surface area of a sphere with radius ${r}. Round to 2 decimal places.`,
          answer: String(sa),
          hint: 'Surface area of sphere = 4\u03c0r\u00b2'
        });
      }
    } else {
      const r = _randInt(2, 8);
      const h = _randInt(3, 12);
      const vol = _round(volumeCylinder(r, h), 2);
      problems.push({
        type: 'fill_in',
        question: `Find the volume of a cylinder with radius ${r} and height ${h}. Round to 2 decimal places.`,
        answer: String(vol),
        hint: 'Volume of cylinder = \u03c0r\u00b2h'
      });
    }
  }
  return problems;
}

function _round(val, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

module.exports = {
  areaRectangle,
  perimeterRectangle,
  areaTriangle,
  areaCircle,
  circumferenceCircle,
  volumeRectangularPrism,
  volumeCylinder,
  surfaceAreaRectangularPrism,
  pythagorean,
  volumeCone,
  volumeSphere,
  surfaceAreaSphere,
  areaCircleSector,
  arcLength,
  generateAreaPerimeter,
  generateVolume,
  generatePythagorean,
  generateCircleProblems,
  generate3dProblems
};
