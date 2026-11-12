/**
 * Browser copy of the backend's ingredient matching rules
 * (cookly-backend/src/utils/normalizeIngredient.js + matchService).
 * Used on the recipe page to show "have / missing" instantly, without
 * another API call. Keep the two in sync if the rules change.
 * The synonym list itself is the SAME file the backend uses.
 */
import RAW_SYNONYMS from '../../../cookly-backend/src/data/ingredientSynonyms.json';

const IRREGULAR = {
  leaves: 'leaf',
  loaves: 'loaf',
  halves: 'half',
  knives: 'knife',
  potatoes: 'potato',
  tomatoes: 'tomato',
  mangoes: 'mango',
};
const KEEP_AS_IS = new Set(['molasses', 'brussels', 'grits', 'swiss', 'series']);
const STAPLES = new Set(['water', 'salt', 'sea salt', 'black pepper', 'ice']);

function singularize(word) {
  if (word.length <= 3 || KEEP_AS_IS.has(word)) return word;
  if (IRREGULAR[word]) return IRREGULAR[word];
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (/(ches|shes|xes|sses|zes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith('oes')) return word.slice(0, -2);
  if (/(ss|us|is)$/.test(word)) return word;
  if (word.endsWith('s')) return word.slice(0, -1);
  return word;
}

export function normalizeIngredient(name) {
  if (typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(singularize)
    .join(' ');
}

const containsPhrase = (big, small) => ` ${big} `.includes(` ${small} `);
const plainMatch = (a, b) => a === b || containsPhrase(a, b) || containsPhrase(b, a);

// "mutton" -> ["lamb", "goat meat"], normalized once.
const SYNONYMS = new Map(
  Object.entries(RAW_SYNONYMS)
    .filter(([key]) => !key.startsWith('_'))
    .map(([key, values]) => [normalizeIngredient(key), values.map(normalizeIngredient)])
);
const expand = (name) => [name, ...(SYNONYMS.get(name) || [])];

// Recipe ingredient vs pantry item, with synonyms in both directions.
const matches = (recipeName, pantryItem) =>
  expand(pantryItem).some((t) => plainMatch(recipeName, t)) ||
  expand(recipeName).some((t) => plainMatch(t, pantryItem));

/** Split recipe ingredients into have / missing for a pantry (array of raw strings). */
export function splitIngredients(ingredients, pantryRaw, { assumeStaples = true } = {}) {
  const pantry = [...new Set(pantryRaw.map(normalizeIngredient).filter(Boolean))];
  const have = [];
  const missing = [];

  for (const ing of ingredients) {
    const key = normalizeIngredient(ing.name);
    if (!key) continue;
    if (pantry.some((p) => matches(key, p)) || (assumeStaples && STAPLES.has(key))) have.push(ing);
    else missing.push(ing);
  }

  const total = have.length + missing.length;
  return { have, missing, total, percent: total ? Math.round((have.length / total) * 100) : 0 };
}

/** Match tiers used for colours and labels everywhere a % is shown. */
export function matchTier(percent) {
  if (percent >= 75) return { key: 'ready', label: 'Ready to cook' };
  if (percent >= 40) return { key: 'almost', label: 'Almost there' };
  return { key: 'shop', label: 'Needs a shop' };
}

/** Friendly emoji for common ingredients (purely decorative). */
const EMOJI = {
  egg: '🥚', onion: '🧅', tomato: '🍅', chicken: '🍗', rice: '🍚', garlic: '🧄', cheese: '🧀',
  pasta: '🍝', potato: '🥔', carrot: '🥕', milk: '🥛', butter: '🧈', bread: '🍞', lemon: '🍋',
  beef: '🥩', fish: '🐟', mushroom: '🍄', pepper: '🌶️', avocado: '🥑', apple: '🍎', banana: '🍌',
  corn: '🌽', broccoli: '🥦', cucumber: '🥒', shrimp: '🦐', prawn: '🦐', bacon: '🥓', honey: '🍯',
  flour: '🌾', sugar: '🍬', chocolate: '🍫', strawberry: '🍓', lime: '🍋', ginger: '🫚', spinach: '🥬',
  mutton: '🍖', lamb: '🍖', goat: '🍖', okra: '🫛', bhindi: '🫛', paneer: '🧀', aubergine: '🍆',
  brinjal: '🍆', eggplant: '🍆', capsicum: '🫑', coconut: '🥥', peas: '🫛', pea: '🫛', curd: '🥣', yogurt: '🥣',
};

export function ingredientEmoji(name) {
  const key = normalizeIngredient(name);
  if (EMOJI[key]) return EMOJI[key];
  const word = key.split(' ').find((w) => EMOJI[w]);
  return word ? EMOJI[word] : '🥄';
}
