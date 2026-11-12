/**
 * Tests for the TheMealDB service with axios mocked out, so we can check
 * caching, "no results" handling and error mapping without any network.
 */
jest.mock('axios', () => {
  const get = jest.fn();
  return { create: jest.fn(() => ({ get })), __get: get };
});

const axios = require('axios');
const mealdb = require('../src/services/mealdbService');
const { app, request } = require('./helpers');

const get = axios.__get;
const ok = (data) => Promise.resolve({ data });

const rawMeal = (id, name = `Meal ${id}`) => ({
  idMeal: String(id),
  strMeal: name,
  strIngredient1: 'Eggs',
  strMeasure1: '2',
});

beforeEach(() => {
  get.mockReset();
  mealdb._cache.clear();
});

describe('mealdbService', () => {
  it('treats { meals: null } as "no results"', async () => {
    get.mockReturnValue(ok({ meals: null }));

    await expect(mealdb.searchByName('zzz')).resolves.toEqual([]);
    await expect(mealdb.filterByIngredient('zzz')).resolves.toEqual([]);
    await expect(mealdb.getMealById('1')).resolves.toBeNull();
  });

  it('caches responses: the same request only hits TheMealDB once', async () => {
    get.mockReturnValue(ok({ meals: [rawMeal(1)] }));

    await mealdb.getMealById('1');
    await mealdb.getMealById('1');

    expect(get).toHaveBeenCalledTimes(1);
  });

  it('shares one HTTP call between identical parallel requests', async () => {
    get.mockReturnValue(ok({ meals: [rawMeal(1)] }));

    await Promise.all([mealdb.getMealById('1'), mealdb.getMealById('1'), mealdb.getMealById('1')]);

    expect(get).toHaveBeenCalledTimes(1);
  });

  it('does not cache random meals', async () => {
    get.mockReturnValue(ok({ meals: [rawMeal(1)] }));

    await mealdb.getRandomMeal();
    await mealdb.getRandomMeal();

    expect(get).toHaveBeenCalledTimes(2);
  });

  it('does not cache failures', async () => {
    get.mockRejectedValueOnce({ code: 'ECONNRESET' }).mockReturnValue(ok({ meals: [rawMeal(1)] }));

    await expect(mealdb.getMealById('1')).rejects.toMatchObject({ statusCode: 502 });
    await expect(mealdb.getMealById('1')).resolves.toMatchObject({ mealdbId: '1' });
  });

  it('maps a timeout to 504', async () => {
    get.mockRejectedValue({ code: 'ECONNABORTED' });
    await expect(mealdb.searchByName('x')).rejects.toMatchObject({ statusCode: 504 });
  });

  it('maps an upstream error status to 502', async () => {
    get.mockRejectedValue({ response: { status: 500 } });
    await expect(mealdb.searchByName('x')).rejects.toMatchObject({ statusCode: 502 });
  });

  it('sends multi-word ingredients with underscores', async () => {
    get.mockReturnValue(ok({ meals: [] }));
    await mealdb.filterByIngredient('chicken breast');

    expect(get).toHaveBeenCalledWith('filter.php', { params: { i: 'chicken_breast' } });
  });
});

describe('GET /api/meals routes', () => {
  it('returns normalized search results', async () => {
    get.mockReturnValue(ok({ meals: [rawMeal(52771, 'Spicy Arrabiata Penne')] }));

    const res = await request(app).get('/api/meals/search?q=arrabiata');

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(1);
    expect(res.body.data.results[0]).toMatchObject({
      mealdbId: '52771',
      title: 'Spicy Arrabiata Penne',
      ingredients: [{ name: 'Eggs', measure: '2' }],
    });
  });

  it('returns 404 for an unknown meal id', async () => {
    get.mockReturnValue(ok({ meals: null }));
    const res = await request(app).get('/api/meals/999999');

    expect(res.status).toBe(404);
  });

  it('validates input before calling TheMealDB', async () => {
    const missing = await request(app).get('/api/meals/search');
    const badId = await request(app).get('/api/meals/abc');

    expect(missing.status).toBe(400);
    expect(badId.status).toBe(400);
    expect(get).not.toHaveBeenCalled();
  });

  it('returns 504 when TheMealDB times out', async () => {
    get.mockRejectedValue({ code: 'ECONNABORTED' });
    const res = await request(app).get('/api/meals/category?c=Seafood');

    expect(res.status).toBe(504);
    expect(res.body.success).toBe(false);
  });
});
