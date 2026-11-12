/**
 * ShoppingList model - exactly ONE list per user (unique index on owner).
 *
 * Items are embedded sub-documents instead of a separate collection:
 * a list is always read and written as a whole and stays small, so
 * embedding means one query to load everything. Each item still gets
 * its own _id, which is what PATCH/DELETE /items/:itemId use.
 */
const mongoose = require('mongoose');

const MAX_ITEMS = 200;

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    measure: { type: String, trim: true, maxlength: 50, default: '' },
    checked: { type: Boolean, default: false },
    fromRecipe: { type: mongoose.Schema.Types.ObjectId, ref: 'Recipe', default: null },
  },
  { timestamps: { createdAt: 'addedAt', updatedAt: false } }
);

const shoppingListSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: {
      type: [itemSchema],
      default: [],
      validate: {
        validator: (items) => items.length <= MAX_ITEMS,
        message: `A shopping list can hold at most ${MAX_ITEMS} items`,
      },
    },
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

shoppingListSchema.statics.MAX_ITEMS = MAX_ITEMS;

module.exports = mongoose.model('ShoppingList', shoppingListSchema);
