/**
 * Validation rules for auth requests.
 * Keeping rules in their own file keeps routes readable and lets us reuse them.
 */
const { body } = require('express-validator');

const emailRule = body('email')
  .trim()
  .notEmpty()
  .withMessage('Email is required')
  .bail()
  .isEmail()
  .withMessage('Please provide a valid email')
  .toLowerCase();

const registerRules = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 50 })
    .withMessage('Name must be at most 50 characters'),
  emailRule,
  body('password')
    .isString()
    .withMessage('Password is required')
    .bail()
    .isLength({ min: 8, max: 72 }) // bcrypt only uses the first 72 bytes
    .withMessage('Password must be 8-72 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
    .matches(/[A-Za-z]/)
    .withMessage('Password must contain at least one letter'),
];

const loginRules = [
  emailRule,
  body('password').isString().notEmpty().withMessage('Password is required'),
];

module.exports = { registerRules, loginRules };
