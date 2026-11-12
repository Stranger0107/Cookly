/**
 * "My recipes" controllers. Every route here is protected, so req.user exists.
 *
 * Ownership rule: every query includes `owner: req.user._id`.
 * If you ask for someone else's recipe, the query simply finds nothing and
 * we answer 404, not 403, so we don't even reveal that the id exists.
 */
const { matchedData } = require('express-validator');
const Recipe = require('../models/Recipe');
const ApiError = require('../utils/ApiError');
const escapeRegex = require('../utils/escapeRegex');
const mealdb = require('../services/mealdbService');

const DEFAULT_LIMIT = 12;

// Only data from the body (not params/query), and only fields that passed validation.
const bodyData = (req) => matchedData(req, { locations: ['body'] });

async function findOwnedRecipe(id, userId) {
  const recipe = await Recipe.findOne({ _id: id, owner: userId });
  if (!recipe) throw ApiError.notFound('Recipe not found');
  return recipe;
}

// GET /api/recipes?search=&category=&source=&page=&limit=
async function listRecipes(req, res) {
  const { search, category, source, page = 1, limit = DEFAULT_LIMIT } = matchedData(req, {
    locations: ['query'],
  });

  const filter = { owner: req.user._id };

  if (search) {
    // Case-insensitive "contains" match on the title OR any ingredient name.
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: pattern }, { 'ingredients.name': pattern }];
  }
  if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i');
  if (source) filter.source = source;

  // Run the page query and the total count at the same time.
  const [results, total] = await Promise.all([
    Recipe.find(filter)
      .sort({ createdAt: -1, _id: -1 }) // _id breaks ties so pages never overlap
      .skip((page - 1) * limit)
      .limit(limit),
    Recipe.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      results,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
}

// GET /api/recipes/:id
async function getRecipe(req, res) {
  const recipe = await findOwnedRecipe(req.params.id, req.user._id);
  res.json({ success: true, data: { recipe } });
}

// POST /api/recipes
async function createRecipe(req, res) {
  const recipe = await Recipe.create({
    ...bodyData(req),
    source: 'user', // set by the server, never trusted from the client
    owner: req.user._id,
  });

  res.status(201).json({ success: true, data: { recipe } });
}

// POST /api/recipes/save/:mealdbId   body (optional): { rating, notes }
async function saveFromMealDb(req, res) {
  const { mealdbId } = req.params;

  // Friendly duplicate check. The unique index is the real safety net.
  const existing = await Recipe.findOne({ owner: req.user._id, mealdbId }).select('_id');
  if (existing) {
    throw ApiError.conflict(`You already saved this recipe (id: ${existing._id})`);
  }

  const meal = await mealdb.getMealById(mealdbId);
  if (!meal) throw ApiError.notFound(`No TheMealDB recipe with id ${mealdbId}`);

  const { sourceUrl, ...mealData } = meal; // sourceUrl isn't part of our schema

  const recipe = await Recipe.create({
    ...mealData,
    ...bodyData(req), // optional rating / notes
    source: 'mealdb',
    mealdbId: meal.mealdbId,
    owner: req.user._id,
  });

  res.status(201).json({ success: true, data: { recipe } });
}

// PUT /api/recipes/:id   (partial update: send only the fields you want to change)
async function updateRecipe(req, res) {
  const updates = bodyData(req);

  if (Object.keys(updates).length === 0) {
    throw ApiError.badRequest('Send at least one field to update');
  }

  const recipe = await Recipe.findOneAndUpdate(
    { _id: req.params.id, owner: req.user._id },
    { $set: updates },
    { returnDocument: 'after', runValidators: true } // return the updated doc + enforce schema rules
  );
  if (!recipe) throw ApiError.notFound('Recipe not found');

  res.json({ success: true, data: { recipe } });
}

// DELETE /api/recipes/:id
async function deleteRecipe(req, res) {
  const recipe = await Recipe.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!recipe) throw ApiError.notFound('Recipe not found');

  res.json({ success: true, data: { id: recipe._id } });
}

module.exports = {
  listRecipes,
  getRecipe,
  createRecipe,
  saveFromMealDb,
  updateRecipe,
  deleteRecipe,
};
