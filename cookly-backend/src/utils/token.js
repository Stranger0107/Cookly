/**
 * JWT helpers.
 * The token payload only holds the user id (`sub` = subject, a JWT standard
 * claim). We never put sensitive data in a JWT: it is signed, not encrypted,
 * so anyone can base64-decode and read it.
 */
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

function signToken(userId) {
  return jwt.sign({ sub: userId.toString() }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

// Throws JsonWebTokenError / TokenExpiredError if invalid; errorHandler maps them to 401.
function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = { signToken, verifyToken };
