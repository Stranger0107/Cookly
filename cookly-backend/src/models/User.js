/**
 * User model.
 *
 * Security notes:
 * - We never store the plain password, only a bcrypt hash (passwordHash).
 * - `select: false` means passwordHash is NOT loaded by default queries;
 *   login has to ask for it explicitly with .select('+passwordHash').
 * - toJSON strips passwordHash anyway, as a second safety net, so it can
 *   never accidentally leak into an API response.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12; // cost factor: higher = slower to hash = harder to brute force

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true, // creates a unique index -> duplicate emails fail with code 11000
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
    toJSON: {
      transform(doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Static: hash a plain password before creating a user.
userSchema.statics.hashPassword = function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
};

// Instance method: check a login attempt against the stored hash.
userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
