/**
 * Shopping list controllers. Every query is scoped by `owner: req.user._id`,
 * so a user can only ever see or change their own list and items.
 *
 * Every response returns the full, updated list so the frontend can just
 * re-render it without a second request.
 */
const { matchedData } = require('express-validator');
const ShoppingList = require('../models/ShoppingList');
const Recipe = require('../models/Recipe');
const ApiError = require('../utils/ApiError');
const { normalizeIngredient } = require('../utils/normalizeIngredient');
const { toPantry, splitIngredients } = require('../services/matchService');

const sendList = (res, list, extra = {}, status = 200) =>
  res.status(status).json({ success: true, data: { list, ...extra } });

/**
 * Get the user's list, creating an empty one the first time.
 * `upsert` makes this a single atomic DB call, and the unique index on
 * owner guarantees two parallel requests can't create two lists.
 */
function getOrCreateList(userId) {
  return ShoppingList.findOneAndUpdate(
    { owner: userId },
    { $setOnInsert: { owner: userId, items: [] } },
    { upsert: true, returnDocument: 'after', runValidators: true }
  );
}

/**
 * Add items to the list, skipping any that are already on it and not yet
 * checked off ("Eggs" and "egg" count as the same item).
 * Returns { added, skipped } so the client can tell the user what happened.
 */
function addItemsToList(list, newItems, fromRecipe = null) {
  const onList = new Set(
    list.items.filter((item) => !item.checked).map((item) => normalizeIngredient(item.name))
  );

  const added = [];
  const skipped = [];

  for (const { name, measure } of newItems) {
    const key = normalizeIngredient(name);
    if (onList.has(key)) {
      skipped.push(name);
      continue;
    }
    onList.add(key); // also de-dupes within the same request
    list.items.push({ name, measure: measure || '', fromRecipe });
    added.push(name);
  }

  if (list.items.length > ShoppingList.MAX_ITEMS) {
    throw ApiError.badRequest(
      `A shopping list can hold at most ${ShoppingList.MAX_ITEMS} items. Clear checked items first.`
    );
  }

  return { added, skipped };
}

// GET /api/shopping-list
async function getList(req, res) {
  sendList(res, await getOrCreateList(req.user._id));
}

// POST /api/shopping-list/items   { name, measure } or { items: [...] }
async function addItems(req, res) {
  const { items } = matchedData(req, { locations: ['body'] });

  const list = await getOrCreateList(req.user._id);
  const result = addItemsToList(list, items);
  await list.save();

  sendList(res, list, result, result.added.length ? 201 : 200);
}

// POST /api/shopping-list/from-recipe/:recipeId   { ingredients: [what I have], assumeStaples? }
async function addFromRecipe(req, res) {
  const { ingredients = [], assumeStaples = true } = matchedData(req, { locations: ['body'] });

  // Ownership check: only recipes in the user's own collection.
  const recipe = await Recipe.findOne({ _id: req.params.recipeId, owner: req.user._id })
    .select('title ingredients')
    .lean();
  if (!recipe) throw ApiError.notFound('Recipe not found');

  // Same matching rules as /api/match, so "missing" means the same thing everywhere.
  const { missingIngredients } = splitIngredients(recipe.ingredients, toPantry(ingredients), {
    assumeStaples,
  });

  const list = await getOrCreateList(req.user._id);
  const result = addItemsToList(list, missingIngredients, recipe._id);
  await list.save();

  sendList(res, list, { recipe: { id: recipe._id, title: recipe.title }, ...result },
    result.added.length ? 201 : 200);
}

// PATCH /api/shopping-list/items/:itemId   { checked?: boolean }  (no body = toggle)
async function toggleItem(req, res) {
  const { checked } = matchedData(req, { locations: ['body'] });

  const list = await ShoppingList.findOne({ owner: req.user._id });
  const item = list && list.items.id(req.params.itemId); // .id() finds a sub-document by _id
  if (!item) throw ApiError.notFound('Item not found on your shopping list');

  item.checked = checked === undefined ? !item.checked : checked;
  await list.save();

  sendList(res, list, { item });
}

// DELETE /api/shopping-list/items/:itemId
async function removeItem(req, res) {
  // $pull removes matching array elements in one atomic update.
  const list = await ShoppingList.findOneAndUpdate(
    { owner: req.user._id, 'items._id': req.params.itemId },
    { $pull: { items: { _id: req.params.itemId } } },
    { returnDocument: 'after' }
  );
  if (!list) throw ApiError.notFound('Item not found on your shopping list');

  sendList(res, list);
}

// DELETE /api/shopping-list/checked
async function clearChecked(req, res) {
  const list = await getOrCreateList(req.user._id);
  const before = list.items.length;

  list.items = list.items.filter((item) => !item.checked);
  await list.save();

  sendList(res, list, { removed: before - list.items.length });
}

module.exports = { getList, addItems, addFromRecipe, toggleItem, removeItem, clearChecked };
