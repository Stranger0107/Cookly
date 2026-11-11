/**
 * Validation for POST /api/match
 *   { ingredients: ["egg", "onion"] | "eggs, onion, tomato",
 *     includeMealDb?: boolean, assumeStaples?: boolean, limit?: 1-50 }
 */
const { body } = require('express-validator');

// Ingredients are capped at 10 because each one triggers a couple of TheMealDB calls.
const MAX_INGREDIENTS = 10;

// Accept a comma-separated string as well as an array (friendlier for a text box).
const toList = (value) => (typeof value === 'string' ? value.split(',') : value);

const matchRules = [
  body('ingredients')
    .customSanitizer(toList)
    .isArray({ min: 1 })
    .withMessage('Send at least one ingredient, e.g. ["egg", "onion"] or "egg, onion"')
    .bail()
    .customSanitizer((list) =>
      list.map((item) => (typeof item === 'string' ? item.trim() : item)).filter((item) => item !== '')
    )
    .isArray({ min: 1, max: MAX_INGREDIENTS })
    .withMessage(`Send between 1 and ${MAX_INGREDIENTS} ingredients`),
  body('ingredients.*')
    .isString()
    .withMessage('Each ingredient must be text')
    .isLength({ max: 50 })
    .withMessage('Each ingredient must be at most 50 characters'),

  body('includeMealDb').optional().isBoolean().withMessage('includeMealDb must be true or false').toBoolean(),
  body('assumeStaples').optional().isBoolean().withMessage('assumeStaples must be true or false').toBoolean(),
  body('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be 1-50').toInt(),
];

module.exports = { matchRules, MAX_INGREDIENTS };
