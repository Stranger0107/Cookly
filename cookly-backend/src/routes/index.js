/**
 * Root API router: mounts every feature router under /api.
 * New features (auth, meals, recipes...) get plugged in here as we build them.
 */
const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const mealRoutes = require('./mealRoutes');
const recipeRoutes = require('./recipeRoutes');
const matchRoutes = require('./matchRoutes');
const shoppingListRoutes = require('./shoppingListRoutes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/meals', mealRoutes);
router.use('/recipes', recipeRoutes);
router.use('/match', matchRoutes);
router.use('/shopping-list', shoppingListRoutes);

module.exports = router;
