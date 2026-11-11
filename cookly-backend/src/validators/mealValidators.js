/**
 * Validation for the TheMealDB proxy routes.
 * We validate before calling the external API so junk input never leaves our server.
 */
const { query, param } = require('express-validator');

// Letters, numbers, spaces and a few common punctuation marks ("Mac & Cheese", "jalapeño").
const SAFE_TEXT = /^[\p{L}\p{N}\s&'.,_-]+$/u;

const textQuery = (field, label) =>
  query(field)
    .trim()
    .notEmpty()
    .withMessage(`${label} is required (?${field}=...)`)
    .bail()
    .isLength({ max: 60 })
    .withMessage(`${label} must be at most 60 characters`)
    .matches(SAFE_TEXT)
    .withMessage(`${label} contains invalid characters`);

const searchRules = [textQuery('q', 'Search term')];
const ingredientRules = [textQuery('i', 'Ingredient')];
const categoryRules = [textQuery('c', 'Category')];
const areaRules = [textQuery('a', 'Area')];

const mealIdRules = [
  param('id').isInt({ min: 1 }).withMessage('Meal id must be a positive number'),
];

module.exports = { searchRules, ingredientRules, categoryRules, areaRules, mealIdRules };
