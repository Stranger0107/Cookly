/**
 * A custom error that carries an HTTP status code.
 *
 * Anywhere in the app (controllers, services, middleware) we can do:
 *   throw ApiError.notFound('Recipe not found');
 * and the central error handler turns it into a clean JSON response.
 *
 * `isOperational = true` marks errors we expected (bad input, not found...).
 * Anything else is a bug, and we hide its details from the client.
 */
class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details; // optional, e.g. a list of validation errors
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Not authorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'You do not have permission to do that') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Resource already exists') {
    return new ApiError(409, message);
  }

  static badGateway(message = 'Upstream service failed') {
    return new ApiError(502, message);
  }
}

module.exports = ApiError;
