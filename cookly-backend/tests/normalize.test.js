/**
 * Pure unit tests for the normalizing helpers: no database, no HTTP.
 */
const { normalizeMeal, normalizeMealSummary, extractSteps } = require('../src/utils/normalizeMeal');
const { normalizeIngredient, mealdbSearchTerms } = require('../src/utils/normalizeIngredient');

describe('normalizeMeal', () => {
  const rawMeal = {
    idMeal: '52772',
    strMeal: ' Teriyaki Chicken Casserole ',
    strCategory: 'Chicken',
    strArea: 'Japanese',
    strInstructions: 'STEP 1\r\nPreheat oven.\r\n\r\n2. Mix the sauce.\r\nBake.',
    strMealThumb: 'https://img.test/meal.jpg',
    strTags: 'Meat, Casserole',
    strYoutube: 'https://youtube.test/watch?v=1',
    strIngredient1: 'soy sauce',
    strMeasure1: '3/4 cup',
    strIngredient2: 'Water ',
    strMeasure2: ' 1/2 cup',
    strIngredient3: 'water', // duplicate (different case) -> dropped
    strMeasure3: '1 cup',
    strIngredient4: '',
    strMeasure4: '',
    strIngredient5: null,
    strMeasure5: null,
  };

  it('turns strIngredientN / strMeasureN into a clean [{ name, measure }] array', () => {
    expect(normalizeMeal(rawMeal).ingredients).toEqual([
      { name: 'soy sauce', measure: '3/4 cup' },
      { name: 'Water', measure: '1/2 cup' },
    ]);
  });

  it('maps the other fields to our recipe shape', () => {
    expect(normalizeMeal(rawMeal)).toMatchObject({
      mealdbId: '52772',
      title: 'Teriyaki Chicken Casserole',
      category: 'Chicken',
      area: 'Japanese',
      image: 'https://img.test/meal.jpg',
      youtubeUrl: 'https://youtube.test/watch?v=1',
      tags: ['Meat', 'Casserole'],
      source: 'mealdb',
    });
  });

  it('splits instructions into steps and drops "STEP 1" / "2." markers', () => {
    expect(normalizeMeal(rawMeal).steps).toEqual(['Preheat oven.', 'Mix the sauce.', 'Bake.']);
  });

  it('handles missing fields and null input', () => {
    expect(normalizeMeal(null)).toBeNull();
    expect(normalizeMeal({ idMeal: '1', strMeal: 'X' })).toMatchObject({
      ingredients: [],
      steps: [],
      tags: [],
    });
    expect(extractSteps(undefined)).toEqual([]);
  });

  it('normalizes filter.php summaries', () => {
    expect(
      normalizeMealSummary({ idMeal: '1', strMeal: 'Soup', strMealThumb: 'https://img.test/1.jpg' })
    ).toEqual({ mealdbId: '1', title: 'Soup', image: 'https://img.test/1.jpg', source: 'mealdb' });
  });
});

describe('normalizeIngredient', () => {
  it.each([
    ['Eggs', 'egg'],
    ['  EGG  ', 'egg'],
    ['Cherry Tomatoes', 'cherry tomato'],
    ['potatoes', 'potato'],
    ['berries', 'berry'],
    ['peaches', 'peach'],
    ['leaves', 'leaf'],
    ['Bell-Peppers', 'bell pepper'],
    ['olives', 'olive'],
    ['Onion (diced)', 'onion diced'],
    ['hummus', 'hummus'],
    ['asparagus', 'asparagus'],
    ['glass', 'glass'],
    ['molasses', 'molasses'],
    ['rice', 'rice'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeIngredient(input)).toBe(expected);
  });

  it('returns an empty string for non-text input', () => {
    expect(normalizeIngredient(undefined)).toBe('');
    expect(normalizeIngredient(42)).toBe('');
  });
});

describe('mealdbSearchTerms', () => {
  it('searches both singular and plural spellings', () => {
    expect(mealdbSearchTerms('Eggs')).toEqual(['egg', 'eggs']);
    expect(mealdbSearchTerms('tomato')).toEqual(['tomato', 'tomatoes']);
    expect(mealdbSearchTerms('berry')).toEqual(['berry', 'berries']);
    expect(mealdbSearchTerms('chicken breast')).toEqual(['chicken breast', 'chicken breasts']);
  });

  it('returns nothing for blank input', () => {
    expect(mealdbSearchTerms('   ')).toEqual([]);
  });
});
