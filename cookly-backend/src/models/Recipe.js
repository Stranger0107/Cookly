/**
 * Recipe model - one collection for BOTH kinds of recipes:
 *   source: "user"   -> written by the user
 *   source: "mealdb" -> copied from TheMealDB when the user hits "save"
 *
 * Storing a full copy (instead of only the mealdbId) means a user's
 * collection still works if TheMealDB is down, and they can edit their
 * copy (add notes, tweak ingredients) without affecting anyone else.
 */
const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    measure: { type: String, trim: true, maxlength: 50, default: '' },
  },
  { _id: false } // ingredients don't need their own ids
);

const recipeSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 120 },
    ingredients: {
      type: [ingredientSchema],
      validate: {
        validator: (list) => list.length > 0,
        message: 'A recipe needs at least one ingredient',
      },
    },
    steps: { type: [String], default: [] },
    image: { type: String, trim: true, default: '' },
    category: { type: String, trim: true, maxlength: 50, default: '' },
    area: { type: String, trim: true, maxlength: 50, default: '' },
    youtubeUrl: { type: String, trim: true, default: '' },
    tags: { type: [String], default: [] },

    source: { type: String, enum: ['mealdb', 'user'], required: true, default: 'user' },
    mealdbId: { type: String }, // only set when source = "mealdb"

    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    rating: { type: Number, min: 1, max: 5, default: null },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

/**
 * A user can save the same TheMealDB recipe only once.
 * The partial filter makes the unique rule apply ONLY to documents that
 * actually have a mealdbId, so users can have many of their own recipes
 * (which have no mealdbId) without clashing.
 * This index is the real guarantee against duplicates (even if two save
 * requests race each other); the check in the controller is just for a
 * friendlier error message.
 */
recipeSchema.index(
  { owner: 1, mealdbId: 1 },
  { unique: true, partialFilterExpression: { mealdbId: { $type: 'string' } } }
);

// Speeds up the default listing: "my recipes, newest first".
recipeSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model('Recipe', recipeSchema);
