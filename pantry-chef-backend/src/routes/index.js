/**
 * Root API router: mounts every feature router under /api.
 * New features (auth, meals, recipes...) get plugged in here as we build them.
 */
const express = require('express');
const healthRoutes = require('./healthRoutes');

const router = express.Router();

router.use('/health', healthRoutes);

module.exports = router;
