/**
 * Runs after a list of express-validator rules. If any rule failed, it
 * stops the request with a 400 and a list of field errors, e.g.
 *   { success: false, message: "Validation failed",
 *     errors: [{ field: "email", message: "Please provide a valid email" }] }
 *
 * Usage in a route:  router.post('/register', registerRules, validate, controller)
 */
const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array({ onlyFirstError: true }).map((err) => ({
    field: err.path,
    message: err.msg,
  }));

  next(ApiError.badRequest('Validation failed', details));
}

module.exports = validate;
