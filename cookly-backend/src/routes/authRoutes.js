/**
 * /api/auth routes.
 * Each route is a pipeline: [rate limit] -> [validation rules] -> validate -> controller
 */
const express = require('express');
const rateLimit = require('express-rate-limit');

const { register, login, getMe } = require('../controllers/authController');
const { registerRules, loginRules } = require('../validators/authValidators');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { env } = require('../config/env');

const router = express.Router();

// Tighter limit on credential endpoints to slow down password guessing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { success: false, message: 'Too many auth attempts, please try again later' },
});

router.post('/register', authLimiter, registerRules, validate, register);
router.post('/login', authLimiter, loginRules, validate, login);
router.get('/me', protect, getMe);

module.exports = router;
