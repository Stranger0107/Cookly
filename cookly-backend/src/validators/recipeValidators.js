/**
 * Validation rules for /api/recipes.
 *
 * `recipeBodyRules(isUpdate)` builds one set of rules for both create and
 * update. On create, title + ingredients are required; on update every
 * field is optional (partial update), but anything sent must still be valid.
 *
 * Controllers read the result with matchedData(), so fields that aren't
 * listed here (owner, source, mealdbId, _id...) are silently ignored.
 * That's how we stop a user from e.g. changing a recipe's owner.
 */
const { body, param, query } = require('express-validator');

const URL_OPTIONS = { protocols: ['http', 'https'], require_protocol: true };

// Accept steps as one string (split on new lines) or as an array of strings.
const toStepsArray = (value) => {
  if (typeof value === 'string') {
    return value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return value;
};

function recipeBodyRules(isUpdate = false) {
  // On update, a field may be left out entirely.
  const field = (name) => (isUpdate ? body(name).optional() : body(name));

  return [
    field('title')
      .isString()
      .withMessage('Title must be text')
      .bail()
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ max: 120 })
      .withMessage('Title must be at most 120 characters'),

    field('ingredients')
      .isArray({ min: 1, max: 50 })
      .withMessage('Ingredients must be a list of 1-50 items'),
    body('ingredients.*.name')
      .isString()
      .withMessage('Each ingredient needs a name')
      .bail()
      .trim()
      .notEmpty()
      .withMessage('Each ingredient needs a name')
      .isLength({ max: 100 }),
    body('ingredients.*.measure')
      .optional({ values: 'null' })
      .isString()
      .withMessage('Ingredient measure must be text')
      .trim()
      .isLength({ max: 50 }),

    body('steps')
      .optional()
      .customSanitizer(toStepsArray)
      .isArray({ max: 50 })
      .withMessage('Steps must be text or a list of up to 50 steps'),
    body('steps.*')
      .isString()
      .withMessage('Each step must be text')
      .trim()
      .isLength({ max: 2000 }),

    body('image')
      .optional({ values: 'falsy' })
      .isURL(URL_OPTIONS)
      .withMessage('Image must be a valid http(s) URL'),
    body('youtubeUrl')
      .optional({ values: 'falsy' })
      .isURL(URL_OPTIONS)
      .withMessage('YouTube URL must be a valid http(s) URL'),

    body('category').optional().isString().trim().isLength({ max: 50 }),
    body('area').optional().isString().trim().isLength({ max: 50 }),

    body('tags').optional().isArray({ max: 20 }).withMessage('Tags must be a list'),
    body('tags.*').isString().trim().isLength({ min: 1, max: 30 }),

    ...personalRules,
  ];
}

// Fields a user can add to ANY recipe, including ones saved from TheMealDB.
const personalRules = [
  body('rating')
    .optional({ values: 'null' }) // null clears the rating
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be a whole number from 1 to 5')
    .toInt(),
  body('notes').optional().isString().trim().isLength({ max: 2000 }),
];

const recipeIdRules = [param('id').isMongoId().withMessage('Invalid recipe id')];

const saveFromMealDbRules = [
  param('mealdbId').isInt({ min: 1 }).withMessage('TheMealDB id must be a positive number'),
  ...personalRules,
];

const listRules = [
  query('search').optional().isString().trim().isLength({ max: 100 }),
  query('category').optional().isString().trim().isLength({ max: 50 }),
  query('source').optional().isIn(['mealdb', 'user']).withMessage('Source must be mealdb or user'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be 1 or more').toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
    .toInt(),
];

module.exports = {
  createRecipeRules: recipeBodyRules(false),
  updateRecipeRules: [...recipeIdRules, ...recipeBodyRules(true)],
  recipeIdRules,
  saveFromMealDbRules,
  listRules,
};
