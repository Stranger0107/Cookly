/**
 * Everything that talks to TheMealDB lives here. Controllers (and later the
 * match service) call these functions and never touch axios or raw URLs.
 *
 * Features:
 * - One axios instance with a base URL and an 8s timeout.
 * - In-memory TTL cache (10 min) keyed by endpoint + query params.
 * - Request de-duplication: we cache the *promise*, so if 5 requests for
 *   the same URL arrive at once, only ONE HTTP call is made.
 * - `{ meals: null }` (TheMealDB's "no results") becomes an empty array.
 * - Network errors / timeouts become 502 / 504 ApiErrors.
 */
const axios = require('axios');
const { env } = require('../config/env');
const ApiError = require('../utils/ApiError');
const TTLCache = require('../utils/cache');
const { normalizeMeal, normalizeMealSummary } = require('../utils/normalizeMeal');
const { mealdbSearchTerms } = require('../utils/normalizeIngredient');
const { areaTerms } = require('../utils/areaAliases');

const REQUEST_TIMEOUT_MS = 8000;

const http = axios.create({
  baseURL: env.mealdbBaseUrl.replace(/\/?$/, '/'), // make sure it ends with "/"
  timeout: REQUEST_TIMEOUT_MS,
});

const cache = new TTLCache({ ttlMs: 10 * 60 * 1000, maxEntries: 500 });

function cacheKey(path, params) {
  const query = new URLSearchParams(params).toString();
  return query ? `${path}?${query}` : path;
}

/** Turn axios errors into ApiErrors the client can understand. */
function toApiError(err) {
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
    return ApiError.gatewayTimeout('TheMealDB took too long to respond, please try again');
  }
  if (err.response) {
    return ApiError.badGateway(`TheMealDB responded with status ${err.response.status}`);
  }
  return ApiError.badGateway('Could not reach TheMealDB, please try again later');
}

/**
 * GET a TheMealDB endpoint, using the cache unless `useCache` is false.
 * Resolves to the raw JSON body.
 */
async function request(path, params = {}, { useCache = true } = {}) {
  const key = cacheKey(path, params);

  if (useCache) {
    const cached = cache.get(key);
    if (cached) return cached;
  }

  const promise = http
    .get(path, { params })
    .then((res) => res.data)
    .catch((err) => {
      cache.delete(key); // never cache failures
      throw toApiError(err);
    });

  if (useCache) cache.set(key, promise);
  return promise;
}

// TheMealDB uses { meals: null } (or occasionally a string) for "no results".
const asArray = (value) => (Array.isArray(value) ? value : []);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** search.php?s=  -> full meals (search returns complete objects). */
async function searchByName(name) {
  const data = await request('search.php', { s: name });
  return asArray(data.meals).map(normalizeMeal);
}

/** filter.php?i=  -> summaries ({ mealdbId, title, image }). Free tier = one ingredient. */
async function filterByIngredient(ingredient) {
  // TheMealDB uses underscores for spaces, e.g. "chicken_breast".
  const data = await request('filter.php', { i: ingredient.trim().replace(/\s+/g, '_') });
  return asArray(data.meals).map(normalizeMealSummary);
}

/** filter.php?c=  -> summaries. */
async function filterByCategory(category) {
  const data = await request('filter.php', { c: category });
  return asArray(data.meals).map(normalizeMealSummary);
}

// Merge several result lists, dropping duplicate meals (first one wins).
function uniqueMeals(lists) {
  const seen = new Set();
  return lists.flat().filter((meal) => !seen.has(meal.mealdbId) && seen.add(meal.mealdbId));
}

/**
 * Ingredient search for people, not machines: tries singular/plural and
 * synonyms ("mutton" -> lamb, goat meat) and merges the results.
 * Used by the Explore page; the match service calls filterByIngredient per term itself.
 */
async function searchByIngredient(ingredient) {
  const terms = mealdbSearchTerms(ingredient);
  const lists = await Promise.all(terms.map((term) => filterByIngredient(term)));
  return uniqueMeals(lists);
}

/** filter.php?a= for the cuisine name AND its country ("Indian" + "India") -> summaries. */
async function filterByArea(area) {
  const lists = await Promise.all(
    areaTerms(area).map((term) => request('filter.php', { a: term }).then((data) => asArray(data.meals)))
  );
  return uniqueMeals(lists.map((list) => list.map(normalizeMealSummary)));
}

/** lookup.php?i=  -> one full meal, or null if the id doesn't exist. */
async function getMealById(id) {
  const data = await request('lookup.php', { i: id });
  const [meal] = asArray(data.meals);
  return meal ? normalizeMeal(meal) : null;
}

/** Fetch several meals' full details in parallel (used by the match service). */
async function getMealsByIds(ids) {
  const meals = await Promise.all(ids.map((id) => getMealById(id)));
  return meals.filter(Boolean);
}

/** random.php -> never cached, otherwise "random" would return the same meal for 10 min. */
async function getRandomMeal() {
  const data = await request('random.php', {}, { useCache: false });
  const [meal] = asArray(data.meals);
  return meal ? normalizeMeal(meal) : null;
}

/**
 * All categories. We use categories.php rather than list.php?c=list because
 * it also returns a thumbnail and description, which the frontend can show.
 */
async function listCategories() {
  const data = await request('categories.php');
  return asArray(data.categories).map((c) => ({
    id: c.idCategory,
    name: c.strCategory,
    image: c.strCategoryThumb,
    description: (c.strCategoryDescription || '').trim(),
  }));
}

module.exports = {
  searchByName,
  filterByIngredient,
  searchByIngredient,
  filterByCategory,
  filterByArea,
  getMealById,
  getMealsByIds,
  getRandomMeal,
  listCategories,
  _cache: cache, // exposed for tests only
};
