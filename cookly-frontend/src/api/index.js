/**
 * Every backend endpoint the app uses, in one place.
 * Each function resolves with the `data` part of the API response.
 */
import client from './client';

export const authApi = {
  register: (body) => client.post('/auth/register', body), // { user, token }
  login: (body) => client.post('/auth/login', body), // { user, token }
  me: () => client.get('/auth/me'), // { user }
};

export const mealsApi = {
  search: (q) => client.get('/meals/search', { params: { q } }), // { count, results: [full meal] }
  byIngredient: (i) => client.get('/meals/ingredient', { params: { i } }), // { count, results: [summary] }
  byCategory: (c) => client.get('/meals/category', { params: { c } }),
  byArea: (a) => client.get('/meals/area', { params: { a } }),
  random: () => client.get('/meals/random'), // { meal }
  categories: () => client.get('/meals/categories'), // { count, results: [category] }
  get: (id) => client.get(`/meals/${id}`), // { meal }
};

export const recipesApi = {
  list: (params) => client.get('/recipes', { params }), // { results, pagination }
  get: (id) => client.get(`/recipes/${id}`), // { recipe }
  create: (body) => client.post('/recipes', body), // { recipe }
  saveFromMealDb: (mealdbId, body = {}) => client.post(`/recipes/save/${mealdbId}`, body),
  update: (id, body) => client.put(`/recipes/${id}`, body),
  remove: (id) => client.delete(`/recipes/${id}`), // { id }
};

export const matchApi = {
  // { pantry, count, results: [match], warnings? }
  find: (body) => client.post('/match', body),
};

export const shoppingListApi = {
  get: () => client.get('/shopping-list'), // { list }
  addItems: (items) => client.post('/shopping-list/items', { items }), // { list, added, skipped }
  addFromRecipe: (recipeId, body) => client.post(`/shopping-list/from-recipe/${recipeId}`, body),
  toggle: (itemId, checked) =>
    client.patch(`/shopping-list/items/${itemId}`, checked === undefined ? undefined : { checked }),
  removeItem: (itemId) => client.delete(`/shopping-list/items/${itemId}`),
  clearChecked: () => client.delete('/shopping-list/checked'), // { list, removed }
};
