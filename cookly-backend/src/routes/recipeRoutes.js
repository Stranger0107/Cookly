/**
 * /api/recipes - the logged-in user's own recipe collection.
 * `router.use(protect)` applies auth to every route below it in one line.
 */
const express = require('express');
const recipes = require('../controllers/recipeController');
const rules = require('../validators/recipeValidators');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', rules.listRules, validate, recipes.listRecipes);
router.post('/', rules.createRecipeRules, validate, recipes.createRecipe);

// Declared before "/:id" routes so "save" is never read as an id.
router.post('/save/:mealdbId', rules.saveFromMealDbRules, validate, recipes.saveFromMealDb);

router.get('/:id', rules.recipeIdRules, validate, recipes.getRecipe);
router.put('/:id', rules.updateRecipeRules, validate, recipes.updateRecipe);
router.delete('/:id', rules.recipeIdRules, validate, recipes.deleteRecipe);

module.exports = router;
