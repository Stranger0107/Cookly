/**
 * /api/meals - public proxy to TheMealDB.
 *
 * Why proxy instead of calling TheMealDB from the frontend?
 * - one consistent, normalized response shape
 * - server-side caching shared by all users
 * - the API key (if we upgrade from the test key) stays secret on the server
 *
 * Order matters: fixed paths (/random, /categories) must be declared
 * BEFORE /:id, otherwise Express would treat "random" as an id.
 */
const express = require('express');
const meals = require('../controllers/mealController');
const rules = require('../validators/mealValidators');
const validate = require('../middleware/validate');

const router = express.Router();

router.get('/search', rules.searchRules, validate, meals.search);
router.get('/ingredient', rules.ingredientRules, validate, meals.byIngredient);
router.get('/category', rules.categoryRules, validate, meals.byCategory);
router.get('/area', rules.areaRules, validate, meals.byArea);
router.get('/random', meals.random);
router.get('/categories', meals.categories);
router.get('/:id', rules.mealIdRules, validate, meals.getById);

module.exports = router;
