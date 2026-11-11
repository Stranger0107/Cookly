/**
 * `protect` middleware: only lets a request through if it carries a valid
 * JWT in the header  ->  Authorization: Bearer <token>
 *
 * On success it attaches the logged-in user to `req.user`, so controllers
 * can do things like Recipe.find({ owner: req.user._id }).
 */
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../utils/token');

async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized('Not authorized, no token provided');
  }

  const payload = verifyToken(token); // throws 401 via errorHandler if invalid/expired

  // Re-check the DB: the user might have been deleted after the token was issued.
  const user = await User.findById(payload.sub);
  if (!user) {
    throw ApiError.unauthorized('User for this token no longer exists');
  }

  req.user = user;
  next();
}

module.exports = { protect };
