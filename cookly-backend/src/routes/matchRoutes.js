/**
 * /api/match - protected, because it also searches the user's own recipes.
 */
const express = require('express');
const { matchRecipes } = require('../controllers/matchController');
const { matchRules } = require('../validators/matchValidators');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, matchRules, validate, matchRecipes);

module.exports = router;
