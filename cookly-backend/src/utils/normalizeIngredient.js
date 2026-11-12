/**
 * Ingredient name normalization, so "Eggs ", "egg" and "EGGS" all compare equal.
 *
 *   normalizeIngredient("  Cherry Tomatoes ") -> "cherry tomato"
 *
 * Steps: lowercase -> strip punctuation -> collapse spaces -> singularize each word.
 * The singularizer is deliberately simple (a few English rules + exceptions).
 * It's not perfect, but it's predictable and easy to explain. A real product
 * might use a library like `pluralize` or an ingredient synonym table.
 */

// Words where the simple rules would give the wrong answer.
const IRREGULAR = {
  leaves: 'leaf',
  loaves: 'loaf',
  halves: 'half',
  knives: 'knife',
  potatoes: 'potato',
  tomatoes: 'tomato',
  mangoes: 'mango',
};

// Words that end in "s" but are already singular (or never used in singular).
// Both sides of a comparison go through this same function, so it only
// matters that a word is handled consistently, not that it's "correct" English.
const KEEP_AS_IS = new Set(['molasses', 'brussels', 'grits', 'swiss', 'series']);

function singularize(word) {
  if (word.length <= 3 || KEEP_AS_IS.has(word)) return word;
  if (IRREGULAR[word]) return IRREGULAR[word];

  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`; // berries -> berry
  if (/(ches|shes|xes|sses|zes)$/.test(word)) return word.slice(0, -2); // peaches -> peach
  if (word.endsWith('oes')) return word.slice(0, -2); // avocadoes -> avocado
  if (/(ss|us|is)$/.test(word)) return word; // cress, citrus, ...
  if (word.endsWith('s')) return word.slice(0, -1); // eggs -> egg

  return word;
}

function normalizeIngredient(name) {
  if (typeof name !== 'string') return '';

  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ') // drop punctuation like "," "(" "."
    .replace(/-/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(singularize)
    .join(' ');
}

/**
 * Synonyms: people (and recipes) call the same thing different names.
 * "mutton" is "Lamb" / "Goat Meat" in TheMealDB, "capsicum" is "Red Pepper",
 * "curd" is "Yogurt". The list lives in src/data/ingredientSynonyms.json and
 * is shared with the frontend. Keys and values are normalized once, here.
 */
const RAW_SYNONYMS = require('../data/ingredientSynonyms.json');

const SYNONYMS = new Map(
  Object.entries(RAW_SYNONYMS)
    .filter(([key]) => !key.startsWith('_'))
    .map(([key, values]) => [normalizeIngredient(key), values.map(normalizeIngredient)])
);

/** Other names for an (already normalized) ingredient: synonymsOf("mutton") -> ["lamb", "goat meat"] */
function synonymsOf(normalized) {
  return SYNONYMS.get(normalized) || [];
}

/** The ingredient plus its synonyms, all normalized. */
function expandIngredient(normalized) {
  return [normalized, ...synonymsOf(normalized)];
}

/** Simple English plural of the LAST word: "chicken breast" -> "chicken breasts" */
function pluralOf(phrase) {
  const words = phrase.split(' ');
  const last = words.pop();

  let plural;
  if (/(ch|sh|x|s|z|o)$/.test(last)) plural = `${last}es`;
  else if (/[^aeiou]y$/.test(last)) plural = `${last.slice(0, -1)}ies`;
  else plural = `${last}s`;

  return [...words, plural].join(' ');
}

const MAX_TERMS = 8; // cap TheMealDB calls per ingredient

/**
 * TheMealDB's filter.php only does EXACT name matches, and it is
 * inconsistent: "egg" and "eggs" return different meals. So for each
 * ingredient we search a couple of spellings, plus its synonyms, and merge.
 *   mealdbSearchTerms("Tomatoes") -> ["tomato", "tomatoes"]
 *   mealdbSearchTerms("mutton")   -> ["mutton", "muttons", "lamb", "lambs", "goat meat", "goat meats"]
 */
function mealdbSearchTerms(raw) {
  const singular = normalizeIngredient(raw);
  if (!singular) return [];

  const terms = [singular, pluralOf(singular), raw.trim().toLowerCase()];
  for (const synonym of synonymsOf(singular)) terms.push(synonym, pluralOf(synonym));

  return [...new Set(terms)].filter(Boolean).slice(0, MAX_TERMS);
}

module.exports = { normalizeIngredient, singularize, mealdbSearchTerms, synonymsOf, expandIngredient };
