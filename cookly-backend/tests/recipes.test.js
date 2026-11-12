// Replace the real TheMealDB service with Jest mocks: no network calls in tests.
jest.mock('../src/services/mealdbService');

const mealdb = require('../src/services/mealdbService');
const Recipe = require('../src/models/Recipe');
const { app, request, createUser, fakeMeal } = require('./helpers');

const omelette = {
  title: 'Masala Omelette',
  ingredients: [
    { name: 'Eggs', measure: '2' },
    { name: 'Onion', measure: '1 small' },
  ],
  steps: 'Beat the eggs\nFry the onion\n\nCook together',
  category: 'Breakfast',
};

let owner;
let other;

beforeEach(async () => {
  jest.resetAllMocks();
  owner = await createUser();
  other = await createUser();
});

const createRecipe = (body = omelette, auth = owner.auth) =>
  request(app).post('/api/recipes').set('Authorization', auth).send(body);

describe('Auth guard', () => {
  it('requires a token for every recipe route', async () => {
    const res = await request(app).get('/api/recipes');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/recipes', () => {
  it('creates a recipe owned by the current user', async () => {
    const res = await createRecipe();

    expect(res.status).toBe(201);
    expect(res.body.data.recipe).toMatchObject({
      title: 'Masala Omelette',
      source: 'user',
      owner: owner.user._id,
      steps: ['Beat the eggs', 'Fry the onion', 'Cook together'], // string split into steps
    });
  });

  it('ignores owner / source / mealdbId sent by the client (mass assignment)', async () => {
    const res = await createRecipe({
      ...omelette,
      owner: other.user._id,
      source: 'mealdb',
      mealdbId: '123',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.recipe.owner).toBe(owner.user._id);
    expect(res.body.data.recipe.source).toBe('user');
    expect(res.body.data.recipe.mealdbId).toBeUndefined();
  });

  it('validates the body', async () => {
    const res = await createRecipe({ title: '', ingredients: [], image: 'not-a-url', rating: 7 });

    expect(res.status).toBe(400);
    const fields = res.body.errors.map((e) => e.field);
    expect(fields).toEqual(expect.arrayContaining(['title', 'ingredients', 'image', 'rating']));
  });
});

describe('GET /api/recipes', () => {
  beforeEach(async () => {
    await createRecipe();
    await createRecipe({ title: 'Tomato Soup', ingredients: [{ name: 'Tomatoes' }], category: 'Soup' });
    await createRecipe({ title: 'Garlic Bread', ingredients: [{ name: 'Bread' }, { name: 'Garlic' }] });
    await createRecipe({ title: 'Not mine', ingredients: [{ name: 'Eggs' }] }, other.auth);
  });

  it('lists only my recipes, newest first, with pagination info', async () => {
    const res = await request(app).get('/api/recipes').set('Authorization', owner.auth);

    expect(res.status).toBe(200);
    expect(res.body.data.results.map((r) => r.title)).toEqual([
      'Garlic Bread',
      'Tomato Soup',
      'Masala Omelette',
    ]);
    expect(res.body.data.pagination).toEqual({ page: 1, limit: 12, total: 3, totalPages: 1 });
  });

  it('paginates', async () => {
    const res = await request(app)
      .get('/api/recipes?page=2&limit=2')
      .set('Authorization', owner.auth);

    expect(res.body.data.results).toHaveLength(1);
    expect(res.body.data.pagination).toMatchObject({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });

  it('searches title and ingredient names, case-insensitively', async () => {
    const byIngredient = await request(app)
      .get('/api/recipes?search=EGG')
      .set('Authorization', owner.auth);
    const byTitle = await request(app).get('/api/recipes?search=soup').set('Authorization', owner.auth);

    expect(byIngredient.body.data.results.map((r) => r.title)).toEqual(['Masala Omelette']);
    expect(byTitle.body.data.results.map((r) => r.title)).toEqual(['Tomato Soup']);
  });

  it('treats regex characters in search as plain text', async () => {
    const res = await request(app).get('/api/recipes?search=(.*').set('Authorization', owner.auth);

    expect(res.status).toBe(200);
    expect(res.body.data.results).toHaveLength(0);
  });

  it('filters by category', async () => {
    const res = await request(app).get('/api/recipes?category=soup').set('Authorization', owner.auth);
    expect(res.body.data.results.map((r) => r.title)).toEqual(['Tomato Soup']);
  });

  it('rejects an out-of-range limit', async () => {
    const res = await request(app).get('/api/recipes?limit=500').set('Authorization', owner.auth);
    expect(res.status).toBe(400);
  });
});

describe('GET / PUT / DELETE /api/recipes/:id', () => {
  let recipeId;

  beforeEach(async () => {
    recipeId = (await createRecipe()).body.data.recipe._id;
  });

  it('gets my recipe', async () => {
    const res = await request(app).get(`/api/recipes/${recipeId}`).set('Authorization', owner.auth);

    expect(res.status).toBe(200);
    expect(res.body.data.recipe.title).toBe('Masala Omelette');
  });

  it('returns 400 for an invalid id', async () => {
    const res = await request(app).get('/api/recipes/not-an-id').set('Authorization', owner.auth);
    expect(res.status).toBe(400);
  });

  it('partially updates my recipe', async () => {
    const res = await request(app)
      .put(`/api/recipes/${recipeId}`)
      .set('Authorization', owner.auth)
      .send({ rating: 4, notes: 'add cheese' });

    expect(res.status).toBe(200);
    expect(res.body.data.recipe).toMatchObject({ title: 'Masala Omelette', rating: 4, notes: 'add cheese' });
  });

  it('rejects an empty update', async () => {
    const res = await request(app)
      .put(`/api/recipes/${recipeId}`)
      .set('Authorization', owner.auth)
      .send({});

    expect(res.status).toBe(400);
  });

  it('cannot change the owner through an update', async () => {
    await request(app)
      .put(`/api/recipes/${recipeId}`)
      .set('Authorization', owner.auth)
      .send({ notes: 'x', owner: other.user._id });

    const recipe = await Recipe.findById(recipeId);
    expect(recipe.owner.toString()).toBe(owner.user._id);
  });

  it('deletes my recipe', async () => {
    const res = await request(app).delete(`/api/recipes/${recipeId}`).set('Authorization', owner.auth);

    expect(res.status).toBe(200);
    expect(await Recipe.findById(recipeId)).toBeNull();
  });

  describe("another user's recipe", () => {
    it('cannot be read (404, not 403)', async () => {
      const res = await request(app).get(`/api/recipes/${recipeId}`).set('Authorization', other.auth);
      expect(res.status).toBe(404);
    });

    it('cannot be updated', async () => {
      const res = await request(app)
        .put(`/api/recipes/${recipeId}`)
        .set('Authorization', other.auth)
        .send({ title: 'Hacked' });

      expect(res.status).toBe(404);
      expect((await Recipe.findById(recipeId)).title).toBe('Masala Omelette');
    });

    it('cannot be deleted', async () => {
      const res = await request(app).delete(`/api/recipes/${recipeId}`).set('Authorization', other.auth);

      expect(res.status).toBe(404);
      expect(await Recipe.findById(recipeId)).not.toBeNull();
    });
  });
});

describe('POST /api/recipes/save/:mealdbId', () => {
  it('fetches the meal from TheMealDB and saves a copy', async () => {
    mealdb.getMealById.mockResolvedValue(fakeMeal());

    const res = await request(app)
      .post('/api/recipes/save/52772')
      .set('Authorization', owner.auth)
      .send({ rating: 5, notes: 'family favourite' });

    expect(res.status).toBe(201);
    expect(mealdb.getMealById).toHaveBeenCalledWith('52772');
    expect(res.body.data.recipe).toMatchObject({
      title: 'Teriyaki Chicken Casserole',
      source: 'mealdb',
      mealdbId: '52772',
      owner: owner.user._id,
      rating: 5,
      notes: 'family favourite',
    });
    expect(res.body.data.recipe.ingredients).toHaveLength(3);
  });

  it('prevents saving the same meal twice', async () => {
    mealdb.getMealById.mockResolvedValue(fakeMeal());
    await request(app).post('/api/recipes/save/52772').set('Authorization', owner.auth);

    const res = await request(app).post('/api/recipes/save/52772').set('Authorization', owner.auth);

    expect(res.status).toBe(409);
    expect(await Recipe.countDocuments({ owner: owner.user._id })).toBe(1);
  });

  it('lets two different users save the same meal', async () => {
    mealdb.getMealById.mockResolvedValue(fakeMeal());
    await request(app).post('/api/recipes/save/52772').set('Authorization', owner.auth);

    const res = await request(app).post('/api/recipes/save/52772').set('Authorization', other.auth);
    expect(res.status).toBe(201);
  });

  it('enforces uniqueness at the database level too', async () => {
    const doc = { ...fakeMeal(), owner: owner.user._id };
    await Recipe.create(doc);
    await expect(Recipe.create(doc)).rejects.toMatchObject({ code: 11000 });
  });

  it('returns 404 when TheMealDB has no such meal', async () => {
    mealdb.getMealById.mockResolvedValue(null);
    const res = await request(app).post('/api/recipes/save/999999').set('Authorization', owner.auth);

    expect(res.status).toBe(404);
  });

  it('validates the id', async () => {
    const res = await request(app).post('/api/recipes/save/abc').set('Authorization', owner.auth);

    expect(res.status).toBe(400);
    expect(mealdb.getMealById).not.toHaveBeenCalled();
  });
});
