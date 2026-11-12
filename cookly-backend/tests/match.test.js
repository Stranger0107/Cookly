/**
 * Match logic: pure unit tests for the scoring helpers, then integration
 * tests for POST /api/match with TheMealDB mocked.
 */
jest.mock('../src/services/mealdbService');

const mealdb = require('../src/services/mealdbService');
const Recipe = require('../src/models/Recipe');
const {
  scoreRecipe,
  ingredientMatches,
  rankCandidateIds,
} = require('../src/services/matchService');
const { app, request, createUser } = require('./helpers');

const ing = (...names) => names.map((name) => ({ name, measure: '1' }));

describe('ingredientMatches', () => {
  it.each([
    ['egg', 'egg', true],
    ['chicken breast', 'chicken', true], // pantry is more general
    ['chicken', 'chicken breast', true], // pantry is more specific
    ['olive oil', 'oil', true],
    ['eggplant', 'egg', false], // whole words only
    ['salted butter', 'salt', false],
  ])('recipe "%s" vs pantry "%s" -> %s', (recipeName, pantryItem, expected) => {
    expect(ingredientMatches(recipeName, pantryItem)).toBe(expected);
  });
});

describe('scoreRecipe', () => {
  const pantry = ['egg', 'onion', 'tomato'];

  it('computes matched, missing and matchPercent = matched / total', () => {
    const score = scoreRecipe(ing('Eggs', 'Onions', 'Cheddar Cheese', 'Butter'), pantry);

    expect(score).toEqual({
      matchedIngredients: ['Eggs', 'Onions'],
      missingIngredients: [
        { name: 'Cheddar Cheese', measure: '1' },
        { name: 'Butter', measure: '1' },
      ],
      matchedCount: 2,
      totalIngredients: 4,
      matchPercent: 50,
    });
  });

  it('counts pantry staples like salt and water as available by default', () => {
    const score = scoreRecipe(ing('Eggs', 'Salt', 'Water', 'Milk'), pantry);

    expect(score.matchPercent).toBe(75);
    expect(score.missingIngredients.map((i) => i.name)).toEqual(['Milk']);
  });

  it('can be told not to assume staples', () => {
    const score = scoreRecipe(ing('Eggs', 'Salt'), pantry, { assumeStaples: false });

    expect(score.matchPercent).toBe(50);
    expect(score.missingIngredients.map((i) => i.name)).toEqual(['Salt']);
  });

  it('returns null when none of the pantry ingredients are used (staples alone do not count)', () => {
    expect(scoreRecipe(ing('Salt', 'Water', 'Flour'), pantry)).toBeNull();
  });

  it('understands synonyms: mutton matches Lamb, capsicum matches Red Pepper', () => {
    const score = scoreRecipe(ing('Lamb Shoulder', 'Red Pepper', 'Rice'), ['mutton', 'capsicum']);
    expect(score.matchedIngredients).toEqual(['Lamb Shoulder', 'Red Pepper']);
  });

  it('applies synonyms in both directions (my recipe says Mutton, pantry says lamb)', () => {
    expect(scoreRecipe(ing('Mutton', 'Onion'), ['lamb']).matchedIngredients).toEqual(['Mutton']);
  });
});

describe('rankCandidateIds', () => {
  it('ranks meals by how many pantry ingredients they appeared under', () => {
    expect(rankCandidateIds([['1', '2', '3'], ['2', '3'], ['3']])).toEqual(['3', '2', '1']);
  });

  it('counts a meal once per ingredient even if listed twice (singular + plural search)', () => {
    expect(rankCandidateIds([['1', '1', '2'], ['2']])).toEqual(['2', '1']);
  });

  it('skips excluded ids', () => {
    expect(rankCandidateIds([['1', '2'], ['1']], new Set(['1']))).toEqual(['2']);
  });
});

describe('POST /api/match', () => {
  // A tiny fake TheMealDB.
  const meals = {
    1: { mealdbId: '1', title: 'Shakshuka', ingredients: ing('Eggs', 'Onion', 'Tomatoes', 'Olive Oil') },
    2: { mealdbId: '2', title: 'Plain Omelette', ingredients: ing('Eggs', 'Salt') },
    3: { mealdbId: '3', title: 'Tomato Salad', ingredients: ing('Tomato', 'Basil', 'Olive Oil', 'Mozzarella') },
  };
  const byIngredient = {
    egg: ['1', '2'],
    eggs: ['1'],
    onion: ['1'],
    tomato: ['1', '3'],
  };

  let user;

  beforeEach(async () => {
    jest.resetAllMocks();
    mealdb.filterByIngredient.mockImplementation(async (term) =>
      (byIngredient[term] || []).map((id) => ({ mealdbId: id, title: meals[id].title }))
    );
    mealdb.getMealById.mockImplementation(async (id) => meals[id] || null);

    user = await createUser();
  });

  const match = (body, auth = user.auth) =>
    request(app).post('/api/match').set('Authorization', auth).send(body);

  it('requires authentication', async () => {
    const res = await request(app).post('/api/match').send({ ingredients: ['egg'] });
    expect(res.status).toBe(401);
  });

  it('ranks TheMealDB results by match percent with missing ingredients listed', async () => {
    const res = await match({ ingredients: ['Eggs', 'onion', 'tomato'] });

    expect(res.status).toBe(200);
    expect(res.body.data.pantry).toEqual(['egg', 'onion', 'tomato']);

    const summary = res.body.data.results.map((r) => [r.title, r.matchPercent, r.source]);
    expect(summary).toEqual([
      ['Plain Omelette', 100, 'mealdb'],
      ['Shakshuka', 75, 'mealdb'],
      ['Tomato Salad', 25, 'mealdb'],
    ]);
    expect(res.body.data.results[1].missingIngredients).toEqual([{ name: 'Olive Oil', measure: '1' }]);
  });

  it('calls filter.php for every ingredient and spelling, in parallel', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    mealdb.filterByIngredient.mockImplementation(async (term) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 10));
      inFlight -= 1;
      return (byIngredient[term] || []).map((id) => ({ mealdbId: id }));
    });

    await match({ ingredients: ['egg', 'onion', 'tomato'] });

    const terms = mealdb.filterByIngredient.mock.calls.map(([term]) => term).sort();
    expect(terms).toEqual(['egg', 'eggs', 'onion', 'onions', 'tomato', 'tomatoes']);
    expect(maxInFlight).toBe(6); // all six were running at the same time
  });

  it('merges my own recipes and de-duplicates meals I already saved', async () => {
    await Recipe.create([
      { title: 'Egg Fried Rice', ingredients: ing('Eggs', 'Rice', 'Soy Sauce'), owner: user.user._id },
      { ...meals[1], source: 'mealdb', owner: user.user._id }, // saved copy of Shakshuka
    ]);

    const res = await match({ ingredients: 'eggs, onion, tomato' }); // comma string works too
    const summary = res.body.data.results.map((r) => [r.title, r.source]);

    expect(summary).toEqual([
      ['Plain Omelette', 'mealdb'],
      ['Shakshuka', 'saved'], // only once, as my saved copy
      ['Egg Fried Rice', 'user'],
      ['Tomato Salad', 'mealdb'],
    ]);
    expect(mealdb.getMealById).not.toHaveBeenCalledWith('1'); // no need to fetch what I already have
  });

  it("never includes another user's recipes", async () => {
    const other = await createUser();
    await Recipe.create({ title: 'Secret Eggs', ingredients: ing('Eggs'), owner: other.user._id });

    const res = await match({ ingredients: ['egg'], includeMealDb: false });
    expect(res.body.data.results).toEqual([]);
  });

  it('skips TheMealDB when includeMealDb is false', async () => {
    await Recipe.create({ title: 'Egg Fried Rice', ingredients: ing('Eggs', 'Rice'), owner: user.user._id });

    const res = await match({ ingredients: ['egg'], includeMealDb: false });

    expect(res.body.data.results.map((r) => r.title)).toEqual(['Egg Fried Rice']);
    expect(mealdb.filterByIngredient).not.toHaveBeenCalled();
  });

  it('only fetches full details for the top candidates', async () => {
    await match({ ingredients: ['egg', 'onion', 'tomato'] });

    // Shakshuka appears under all 3 ingredients, so it is fetched (first).
    expect(mealdb.getMealById.mock.calls[0][0]).toBe('1');
    expect(mealdb.getMealById.mock.calls.length).toBeLessThanOrEqual(10);
  });

  it('still answers with my recipes and a warning when TheMealDB is down', async () => {
    mealdb.filterByIngredient.mockRejectedValue(new Error('down'));
    await Recipe.create({ title: 'Egg Fried Rice', ingredients: ing('Eggs', 'Rice'), owner: user.user._id });

    const res = await match({ ingredients: ['egg'] });

    expect(res.status).toBe(200);
    expect(res.body.data.results.map((r) => r.title)).toEqual(['Egg Fried Rice']);
    expect(res.body.data.warnings[0]).toMatch(/unavailable/);
  });

  it('lists ingredients TheMealDB has no recipes for (e.g. okra)', async () => {
    await Recipe.create({ title: 'Bhindi Masala', ingredients: ing('Okra', 'Onion'), owner: user.user._id });

    const res = await match({ ingredients: ['okra', 'egg'] });

    expect(res.body.data.notInMealDb).toEqual(['okra']);
    // my own okra recipe still matches
    expect(res.body.data.results.map((r) => r.title)).toContain('Bhindi Masala');
  });

  it('searches TheMealDB with synonyms (mutton -> lamb)', async () => {
    await match({ ingredients: ['mutton'] });
    const terms = mealdb.filterByIngredient.mock.calls.map(([term]) => term);
    expect(terms).toEqual(expect.arrayContaining(['mutton', 'lamb', 'goat meat']));
  });

  it('respects the limit option', async () => {
    const res = await match({ ingredients: ['egg', 'onion', 'tomato'], limit: 1 });

    expect(res.body.data.count).toBe(1);
    expect(res.body.data.results).toHaveLength(1);
  });

  it.each([
    [{}, 'missing ingredients'],
    [{ ingredients: [] }, 'empty list'],
    [{ ingredients: ' , ' }, 'only blanks'],
    [{ ingredients: Array(11).fill('egg') }, 'too many'],
    [{ ingredients: [1, 2] }, 'not text'],
    [{ ingredients: ['egg'], includeMealDb: 'maybe' }, 'bad boolean'],
  ])('rejects invalid input: %j (%s)', async (body) => {
    const res = await match(body);
    expect(res.status).toBe(400);
  });
});
