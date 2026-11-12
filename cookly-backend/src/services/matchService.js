/**
 * "What can I make?" - ranks recipes by how many of their ingredients the
 * user already has.
 *
 * Flow for findMatches({ userId, ingredients }):
 *   1. Normalize the user's ingredients ("Eggs " -> "egg") and de-duplicate.
 *   2. Load the user's own recipes from MongoDB (their own + saved copies).
 *   3. TheMealDB (optional):
 *        a. filter.php for every ingredient (and its plural spelling) IN PARALLEL
 *        b. count, per meal id, how many of the user's ingredients it appeared under
 *        c. keep the top N candidates and fetch their full details with lookup.php
 *      Meals the user already saved are skipped, because their saved copy is scored instead.
 *   4. Score every recipe: matched / missing ingredients and matchPercent.
 *   5. Merge, drop recipes that use none of the user's ingredients, sort, label the source.
 *
 * The scoring helpers are pure functions (no DB / HTTP), which makes them
 * easy to unit test.
 */
const Recipe = require('../models/Recipe');
const mealdb = require('./mealdbService');
const { normalizeIngredient, mealdbSearchTerms, expandIngredient } = require('../utils/normalizeIngredient');

const DEFAULTS = {
  includeMealDb: true,
  assumeStaples: true,
  limit: 20,
  mealdbCandidates: 10, // how many TheMealDB meals we fetch full details for
};

// Things almost every kitchen has. Matched by exact name only, so
// "pepper" here does NOT swallow "red pepper".
const PANTRY_STAPLES = new Set(['water', 'salt', 'sea salt', 'black pepper', 'ice']);

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

// Does phrase `small` appear in phrase `big` as whole words? ("oil" in "olive oil" -> yes)
const containsPhrase = (big, small) => ` ${big} `.includes(` ${small} `);

/**
 * A recipe ingredient counts as "in the pantry" if the normalized names are
 * equal, or one contains the other as whole words:
 *   pantry "chicken"        matches recipe "chicken breast"
 *   pantry "chicken breast" matches recipe "chicken"
 *   pantry "egg"            does NOT match recipe "eggplant"
 */
function ingredientMatches(recipeIngredient, pantryItem) {
  return (
    recipeIngredient === pantryItem ||
    containsPhrase(recipeIngredient, pantryItem) ||
    containsPhrase(pantryItem, recipeIngredient)
  );
}

/**
 * Like ingredientMatches, but synonyms count too, in both directions:
 *   pantry "mutton"  matches recipe "Lamb Shoulder"  (mutton -> lamb)
 *   pantry "zucchini" matches recipe "Courgettes"    (zucchini -> courgette)
 *   pantry "lamb"    matches a user's recipe "Mutton" (mutton -> lamb, reversed)
 */
function matchesWithSynonyms(recipeIngredient, pantryItem) {
  return (
    expandIngredient(pantryItem).some((term) => ingredientMatches(recipeIngredient, term)) ||
    expandIngredient(recipeIngredient).some((term) => ingredientMatches(term, pantryItem))
  );
}

// Normalize raw user input into a de-duplicated pantry: ["Eggs ", "egg"] -> ["egg"]
const toPantry = (ingredients) => [...new Set(ingredients.map(normalizeIngredient).filter(Boolean))];

/**
 * Split a recipe's ingredients into the ones the user has and the ones
 * they're missing. Shared by the matcher and the shopping list.
 * `pantryHits` counts matches from the user's own list (staples excluded).
 */
function splitIngredients(recipeIngredients, pantry, { assumeStaples = true } = {}) {
  const matchedIngredients = [];
  const missingIngredients = [];
  let pantryHits = 0;

  for (const ingredient of recipeIngredients) {
    const key = normalizeIngredient(ingredient.name);
    if (!key) continue;

    if (pantry.some((item) => matchesWithSynonyms(key, item))) {
      matchedIngredients.push(ingredient.name);
      pantryHits += 1;
    } else if (assumeStaples && PANTRY_STAPLES.has(key)) {
      matchedIngredients.push(ingredient.name);
    } else {
      missingIngredients.push({ name: ingredient.name, measure: ingredient.measure || '' });
    }
  }

  return { matchedIngredients, missingIngredients, pantryHits };
}

/**
 * Score one recipe against the pantry.
 * Returns null if the recipe uses NONE of the user's ingredients
 * (staples alone don't count, or every recipe would match "water").
 */
function scoreRecipe(recipeIngredients, pantry, options = {}) {
  const { matchedIngredients, missingIngredients, pantryHits } = splitIngredients(
    recipeIngredients,
    pantry,
    options
  );

  const totalIngredients = matchedIngredients.length + missingIngredients.length;
  if (pantryHits === 0 || totalIngredients === 0) return null;

  return {
    matchedIngredients,
    missingIngredients,
    matchedCount: matchedIngredients.length,
    totalIngredients,
    matchPercent: Math.round((matchedIngredients.length / totalIngredients) * 100),
  };
}

/**
 * Given, for each pantry ingredient, the list of TheMealDB meal ids that
 * contain it, return the ids that appear under the MOST ingredients first.
 *   [[1,2,3], [2,3], [3]]  ->  [3, 2, 1]
 */
function rankCandidateIds(idListsPerIngredient, excludeIds = new Set()) {
  const hits = new Map(); // mealId -> number of pantry ingredients it contains

  for (const ids of idListsPerIngredient) {
    for (const id of new Set(ids)) {
      if (!excludeIds.has(id)) hits.set(id, (hits.get(id) || 0) + 1);
    }
  }

  return [...hits.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

// Best match first; ties broken by more matches, then fewer missing, then title.
function compareResults(a, b) {
  return (
    b.matchPercent - a.matchPercent ||
    b.matchedCount - a.matchedCount ||
    a.missingIngredients.length - b.missingIngredients.length ||
    a.title.localeCompare(b.title)
  );
}

function toResult(recipe, score, source) {
  return {
    id: recipe._id ? recipe._id.toString() : null, // null for API-only results
    mealdbId: recipe.mealdbId || null,
    title: recipe.title,
    image: recipe.image || '',
    category: recipe.category || '',
    area: recipe.area || '',
    source, // "user" | "saved" | "mealdb"
    ...score,
  };
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

/**
 * Personal collections are small, so we load them (only the fields we need)
 * and score in JS. With thousands of recipes per user we'd pre-filter in
 * Mongo, e.g. by storing normalized ingredient keys with an index.
 */
async function loadUserRecipes(userId) {
  return Recipe.find({ owner: userId })
    .select('title ingredients image category area source mealdbId')
    .limit(1000)
    .lean();
}

async function findMealDbCandidates(pantry, savedIds, maxCandidates) {
  const warnings = [];

  // One filter.php call per (ingredient, spelling), all at once. allSettled
  // means one failed call doesn't throw away the results of the others.
  const searches = pantry.map((item) =>
    Promise.allSettled(mealdbSearchTerms(item).map((term) => mealdb.filterByIngredient(term)))
  );
  const perIngredient = await Promise.all(searches);

  let failedCalls = 0;
  const idLists = perIngredient.map((settledList) =>
    settledList.flatMap((settled) => {
      if (settled.status === 'rejected') {
        failedCalls += 1;
        return [];
      }
      return settled.value.map((meal) => meal.mealdbId);
    })
  );

  const totalCalls = perIngredient.reduce((sum, list) => sum + list.length, 0);
  if (failedCalls === totalCalls) {
    return {
      meals: [],
      notInMealDb: [],
      warnings: ['TheMealDB is unavailable right now; showing only your recipes'],
    };
  }
  if (failedCalls > 0) warnings.push('Some TheMealDB searches failed; results may be incomplete');

  // Ingredients TheMealDB has no recipes for at all (e.g. "okra"), so the UI
  // can say so instead of the user wondering why nothing matched.
  const notInMealDb = pantry.filter(
    (item, i) => idLists[i].length === 0 && perIngredient[i].every((s) => s.status === 'fulfilled')
  );

  const topIds = rankCandidateIds(idLists, savedIds).slice(0, maxCandidates);

  // Full details (ingredient lists) for the shortlisted meals, also in parallel.
  const details = await Promise.allSettled(topIds.map((id) => mealdb.getMealById(id)));
  const meals = details.filter((d) => d.status === 'fulfilled' && d.value).map((d) => d.value);

  if (meals.length < topIds.length) warnings.push('Some TheMealDB recipes could not be loaded');

  return { meals, warnings, notInMealDb };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

async function findMatches({ userId, ingredients, ...options }) {
  const opts = { ...DEFAULTS, ...options };

  const pantry = toPantry(ingredients);

  const userRecipes = await loadUserRecipes(userId);
  const savedIds = new Set(userRecipes.filter((r) => r.mealdbId).map((r) => r.mealdbId));

  const { meals, warnings, notInMealDb } = opts.includeMealDb
    ? await findMealDbCandidates(pantry, savedIds, opts.mealdbCandidates)
    : { meals: [], warnings: [], notInMealDb: [] };

  const results = [];

  for (const recipe of userRecipes) {
    const score = scoreRecipe(recipe.ingredients, pantry, opts);
    if (score) results.push(toResult(recipe, score, recipe.source === 'mealdb' ? 'saved' : 'user'));
  }

  for (const meal of meals) {
    if (savedIds.has(meal.mealdbId)) continue; // de-dupe: the saved copy wins
    const score = scoreRecipe(meal.ingredients, pantry, opts);
    if (score) results.push(toResult(meal, score, 'mealdb'));
  }

  results.sort(compareResults);

  return {
    pantry,
    count: Math.min(results.length, opts.limit),
    results: results.slice(0, opts.limit),
    ...(warnings.length && { warnings }),
    ...(notInMealDb.length && { notInMealDb }),
  };
}

module.exports = {
  findMatches,
  toPantry,
  splitIngredients,
  // exported for unit tests
  scoreRecipe,
  ingredientMatches,
  rankCandidateIds,
  PANTRY_STAPLES,
};
