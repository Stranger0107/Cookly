/**
 * Centralized error handling.
 *
 * Express recognises error middleware by its 4 arguments (err, req, res, next).
 * In Express 5, a rejected promise / thrown error inside an async route
 * handler is forwarded here automatically - no try/catch or asyncHandler needed.
 *
 * Every error leaves the API in the same shape:
 *   { success: false, message: "...", errors?: [...] }
 */
const ApiError = require('../utils/ApiError');
const { env } = require('../config/env');

// Catches requests that didn't match any route.
function notFound(req, res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Translate well-known library errors (Mongoose, JWT, body-parser) into
 * ApiErrors so the client gets a meaningful status instead of a generic 500.
 */
function normalizeError(err) {
  if (err instanceof ApiError) return err;

  // Invalid ObjectId, e.g. GET /api/recipes/not-an-id
  if (err.name === 'CastError') {
    return ApiError.badRequest(`Invalid ${err.path}: ${err.value}`);
  }

  // Schema validation failed (required field missing, enum mismatch...)
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return ApiError.badRequest('Validation failed', details);
  }

  // Unique index violation, e.g. email already registered
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {}).join(', ') || 'field';
    return ApiError.conflict(`Duplicate value for ${field}`);
  }

  if (err.name === 'JsonWebTokenError') return ApiError.unauthorized('Invalid token');
  if (err.name === 'TokenExpiredError') return ApiError.unauthorized('Token expired');

  // Malformed JSON body sent by the client
  if (err.type === 'entity.parse.failed') return ApiError.badRequest('Malformed JSON in request body');

  return null; // unknown error -> treated as 500 below
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const apiError = normalizeError(err);
  const statusCode = apiError ? apiError.statusCode : 500;

  // Log unexpected errors with the stack so we can debug them.
  if (!apiError && !env.isTest) {
    console.error('Unhandled error:', err);
  }

  const body = {
    success: false,
    // Don't leak internal messages of real bugs to the client.
    message: apiError ? apiError.message : 'Something went wrong on our side',
  };

  if (apiError && apiError.details) body.errors = apiError.details;
  if (!env.isProduction && !apiError) body.stack = err.stack;

  res.status(statusCode).json(body);
}

module.exports = { notFound, errorHandler };
