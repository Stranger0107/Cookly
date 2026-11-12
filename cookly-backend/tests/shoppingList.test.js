const ShoppingList = require('../src/models/ShoppingList');
const Recipe = require('../src/models/Recipe');
const { app, request, createUser } = require('./helpers');

let user;
let other;

beforeEach(async () => {
  user = await createUser();
  other = await createUser();
});

const api = (method, path, auth = user.auth) =>
  request(app)[method](`/api/shopping-list${path}`).set('Authorization', auth);

const names = (res) => res.body.data.list.items.map((i) => i.name);

describe('Shopping list', () => {
  it('requires authentication', async () => {
    const res = await request(app).get('/api/shopping-list');
    expect(res.status).toBe(401);
  });

  it('creates one empty list per user on first access, even with parallel requests', async () => {
    const results = await Promise.all([api('get', '/'), api('get', '/'), api('get', '/')]);

    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(results[0].body.data.list.items).toEqual([]);
    expect(await ShoppingList.countDocuments({ owner: user.user._id })).toBe(1);
  });

  it('adds a single item or many, skipping ones already on the list', async () => {
    await api('post', '/items').send({ name: 'Milk', measure: '1 litre' });
    const res = await api('post', '/items').send({ items: ['bread', 'milk', { name: 'Eggs', measure: '6' }, 'eggs'] });

    expect(res.status).toBe(201);
    expect(res.body.data.added).toEqual(['bread', 'Eggs']);
    expect(res.body.data.skipped).toEqual(['milk', 'eggs']);
    expect(names(res)).toEqual(['Milk', 'bread', 'Eggs']);
  });

  it('validates new items', async () => {
    const empty = await api('post', '/items').send({});
    const blank = await api('post', '/items').send({ items: [{ name: '   ' }] });

    expect(empty.status).toBe(400);
    expect(blank.status).toBe(400);
  });

  describe('POST /from-recipe/:recipeId', () => {
    let recipe;

    beforeEach(async () => {
      recipe = await Recipe.create({
        title: 'Masala Omelette',
        owner: user.user._id,
        ingredients: [
          { name: 'Eggs', measure: '2' },
          { name: 'Onions', measure: '1' },
          { name: 'Salt', measure: 'pinch' },
          { name: 'Cheddar Cheese', measure: '50g' },
        ],
      });
    });

    it('adds only the ingredients I am missing, linked to the recipe', async () => {
      const res = await api('post', `/from-recipe/${recipe._id}`).send({ ingredients: 'eggs, onion' });

      expect(res.status).toBe(201);
      expect(res.body.data.added).toEqual(['Cheddar Cheese']); // salt is a staple
      const [item] = res.body.data.list.items;
      expect(item).toMatchObject({ name: 'Cheddar Cheese', measure: '50g', checked: false });
      expect(item.fromRecipe).toBe(recipe._id.toString());
    });

    it('adds everything when no ingredients are sent and staples are not assumed', async () => {
      const res = await api('post', `/from-recipe/${recipe._id}`).send({ assumeStaples: false });
      expect(names(res)).toEqual(['Eggs', 'Onions', 'Salt', 'Cheddar Cheese']);
    });

    it("refuses another user's recipe", async () => {
      const res = await api('post', `/from-recipe/${recipe._id}`, other.auth).send({});
      expect(res.status).toBe(404);
    });
  });

  describe('updating items', () => {
    let milkId;

    beforeEach(async () => {
      const res = await api('post', '/items').send({ items: ['Milk', 'Bread', 'Eggs'] });
      milkId = res.body.data.list.items[0]._id;
    });

    it('toggles an item, or sets checked explicitly', async () => {
      const toggled = await api('patch', `/items/${milkId}`);
      expect(toggled.body.data.item.checked).toBe(true);

      const toggledBack = await api('patch', `/items/${milkId}`);
      expect(toggledBack.body.data.item.checked).toBe(false);

      const set = await api('patch', `/items/${milkId}`).send({ checked: true });
      expect(set.body.data.item.checked).toBe(true);
    });

    it('deletes an item', async () => {
      const res = await api('delete', `/items/${milkId}`);

      expect(res.status).toBe(200);
      expect(names(res)).toEqual(['Bread', 'Eggs']);
      expect((await api('delete', `/items/${milkId}`)).status).toBe(404);
    });

    it('clears all checked items', async () => {
      await api('patch', `/items/${milkId}`);
      const res = await api('delete', '/checked');

      expect(res.body.data.removed).toBe(1);
      expect(names(res)).toEqual(['Bread', 'Eggs']);
    });

    it("cannot touch another user's items", async () => {
      expect((await api('patch', `/items/${milkId}`, other.auth)).status).toBe(404);
      expect((await api('delete', `/items/${milkId}`, other.auth)).status).toBe(404);

      const mine = await api('get', '/');
      expect(names(mine)).toEqual(['Milk', 'Bread', 'Eggs']);
    });

    it('rejects an invalid item id', async () => {
      expect((await api('patch', '/items/not-an-id')).status).toBe(400);
    });
  });
});
