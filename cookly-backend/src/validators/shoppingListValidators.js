/**
 * Validation for /api/shopping-list.
 *
 * POST /items accepts any of these shapes (all become [{ name, measure }]):
 *   { "name": "milk", "measure": "1 litre" }
 *   { "items": ["milk", "bread"] }
 *   { "items": [{ "name": "milk", "measure": "1 litre" }, "bread"] }
 */
const { body, param } = require('express-validator');

function toItemList(value, { req }) {
  // Single-item shortcut: { name, measure }
  const list = value === undefined && req.body.name !== undefined
    ? [{ name: req.body.name, measure: req.body.measure }]
    : value;

  if (!Array.isArray(list)) return list; // let isArray() below report the error
  return list.map((item) => (typeof item === 'string' ? { name: item } : item));
}

// Same flexible input as /api/match: an array or "eggs, onion, tomato".
const toList = (value) => (typeof value === 'string' ? value.split(',') : value);

const addItemsRules = [
  body('items')
    .customSanitizer(toItemList)
    .isArray({ min: 1, max: 50 })
    .withMessage('Send { name } or { items: [...] } with 1-50 items'),
  body('items.*.name')
    .isString()
    .withMessage('Each item needs a name')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Each item needs a name')
    .isLength({ max: 100 }),
  body('items.*.measure')
    .optional({ values: 'null' })
    .isString()
    .withMessage('Measure must be text')
    .trim()
    .isLength({ max: 50 }),
];

const fromRecipeRules = [
  param('recipeId').isMongoId().withMessage('Invalid recipe id'),
  // The ingredients the user already has. Optional: leave it out to add everything.
  body('ingredients')
    .optional()
    .customSanitizer(toList)
    .isArray({ max: 50 })
    .withMessage('Ingredients must be a list (or comma-separated text) of up to 50 items'),
  body('ingredients.*').isString().withMessage('Each ingredient must be text').trim().isLength({ max: 50 }),
  body('assumeStaples').optional().isBoolean().withMessage('assumeStaples must be true or false').toBoolean(),
];

const itemIdRules = [param('itemId').isMongoId().withMessage('Invalid item id')];

const toggleItemRules = [
  ...itemIdRules,
  // Optional: send { checked: true/false } to set it, or nothing to flip it.
  body('checked').optional().isBoolean().withMessage('checked must be true or false').toBoolean(),
];

module.exports = { addItemsRules, fromRecipeRules, itemIdRules, toggleItemRules };
