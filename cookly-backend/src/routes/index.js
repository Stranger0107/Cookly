/**
 * Root API router: mounts every feature router under /api.
 * New features (auth, meals, recipes...) get plugged in here as we build them.
 */
const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

module.exports = router;
