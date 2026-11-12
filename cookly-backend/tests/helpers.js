/**
 * Small helpers shared by the integration tests.
 */
const request = require('supertest');
const app = require('../src/app');

let counter = 0;

/** Register a fresh user and return { user, token, auth } where auth is the header value. */
async function createUser(overrides = {}) {
  counter += 1;
  const body = {
    name: `Test User ${counter}`,
    email: `user${counter}@cookly.test`,
    password: 'secret123',
    ...overrides,
  };

  const res = await request(app).post('/api/auth/register').send(body);
  if (res.status !== 201) {
    throw new Error(`createUser failed: ${res.status} ${JSON.stringify(res.body)}`);
  }

  const { user, token } = res.body.data;
  return { user, token, auth: `Bearer ${token}`, password: body.password };
}

/** A TheMealDB meal that has already been through normalizeMeal(). */
function fakeMeal(overrides = {}) {
  return {
    mealdbId: '52772',
    title: 'Teriyaki Chicken Casserole',
    category: 'Chicken',
    area: 'Japanese',
    image: 'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg',
    youtubeUrl: 'https://www.youtube.com/watch?v=4aZr5hZXP_s',
    sourceUrl: '',
    tags: ['Meat', 'Casserole'],
    ingredients: [
      { name: 'soy sauce', measure: '3/4 cup' },
      { name: 'chicken breasts', measure: '2' },
      { name: 'rice', measure: '1 cup' },
    ],
    steps: ['Preheat oven to 350F.', 'Bake 35 minutes.'],
    source: 'mealdb',
    ...overrides,
  };
}

module.exports = { app, request, createUser, fakeMeal };
