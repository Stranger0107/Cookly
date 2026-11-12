/**
 * /api/shopping-list - the logged-in user's single shopping list.
 * "/checked" is declared before "/items/:itemId" for readability; they
 * can't clash anyway because the paths have different prefixes.
 */
const express = require('express');
const list = require('../controllers/shoppingListController');
const rules = require('../validators/shoppingListValidators');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', list.getList);
router.post('/items', rules.addItemsRules, validate, list.addItems);
router.post('/from-recipe/:recipeId', rules.fromRecipeRules, validate, list.addFromRecipe);
router.delete('/checked', list.clearChecked);
router.patch('/items/:itemId', rules.toggleItemRules, validate, list.toggleItem);
router.delete('/items/:itemId', rules.itemIdRules, validate, list.removeItem);

module.exports = router;
