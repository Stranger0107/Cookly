/**
 * TheMealDB returns meals in an awkward shape:
 *   { idMeal, strMeal, strIngredient1..20, strMeasure1..20, strInstructions, ... }
 * with empty strings or nulls for unused ingredient slots.
 *
 * These helpers turn that into the same clean shape our own Recipe model
 * uses, so the frontend (and the match service) only deals with ONE format.
 */

const MAX_INGREDIENT_SLOTS = 20;

const clean = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * strIngredient1..20 + strMeasure1..20  ->  [{ name, measure }]
 * Skips empty slots and duplicate ingredient names.
 */
function extractIngredients(meal) {
  const ingredients = [];
  const seen = new Set();

  for (let i = 1; i <= MAX_INGREDIENT_SLOTS; i += 1) {
    const name = clean(meal[`strIngredient${i}`]);
    if (!name) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    ingredients.push({ name, measure: clean(meal[`strMeasure${i}`]) });
  }

  return ingredients;
}

/**
 * Instructions come as one long string with \r\n line breaks and sometimes
 * "STEP 1" / "1." markers. We split them into an array of readable steps.
 */
function extractSteps(instructions) {
  return clean(instructions)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .map((line) => line.replace(/^(step\s*\d+[:.)]?|\d+[.)])\s*/i, '')) // drop leading numbering
    .filter((line) => line.length > 1); // drop blank lines and stray "1" lines
}

/** Full meal (from search.php / lookup.php / random.php) -> our recipe shape. */
function normalizeMeal(meal) {
  if (!meal) return null;

  return {
    mealdbId: meal.idMeal,
    title: clean(meal.strMeal),
    category: clean(meal.strCategory),
    area: clean(meal.strArea),
    image: clean(meal.strMealThumb),
    youtubeUrl: clean(meal.strYoutube),
    sourceUrl: clean(meal.strSource),
    tags: clean(meal.strTags)
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    ingredients: extractIngredients(meal),
    steps: extractSteps(meal.strInstructions),
    source: 'mealdb',
  };
}

/** Summary meal (from filter.php: only id, name, thumbnail) -> small card shape. */
function normalizeMealSummary(meal) {
  return {
    mealdbId: meal.idMeal,
    title: clean(meal.strMeal),
    image: clean(meal.strMealThumb),
    source: 'mealdb',
  };
}

module.exports = { normalizeMeal, normalizeMealSummary, extractIngredients, extractSteps };
