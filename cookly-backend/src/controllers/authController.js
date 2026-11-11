/**
 * Auth controllers: register, login and "who am I".
 * Input is already validated by the time we get here (see authValidators).
 * Thrown errors are forwarded to errorHandler automatically by Express 5.
 */
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { signToken } = require('../utils/token');

// Shape returned by register and login.
function authResponse(user) {
  return { user, token: signToken(user._id) };
}

// POST /api/auth/register
async function register(req, res) {
  const { name, email, password } = req.body;

  const exists = await User.exists({ email });
  if (exists) {
    throw ApiError.conflict('An account with this email already exists');
  }

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ name, email, passwordHash });

  res.status(201).json({ success: true, data: authResponse(user) });
}

// POST /api/auth/login
async function login(req, res) {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+passwordHash');

  // Same message for "no such user" and "wrong password" so attackers
  // can't use this endpoint to discover which emails are registered.
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  res.json({ success: true, data: authResponse(user) });
}

// GET /api/auth/me  (protected) - req.user is set by the protect middleware
async function getMe(req, res) {
  res.json({ success: true, data: { user: req.user } });
}

module.exports = { register, login, getMe };
