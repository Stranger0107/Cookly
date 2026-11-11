/**
 * Thin controllers for the TheMealDB proxy. All the real work (HTTP,
 * caching, normalizing) is in mealdbService. Controllers only read input
 * and shape the response.
 *
 * We read input with matchedData(): it returns only the fields that passed
 * validation, already trimmed. (In Express 5, req.query is read-only, so
 * validator sanitizers can't rewrite it in place.)
 */
const { matchedData } = require('express-validator');
const mealdb = require('../services/mealdbService');
const ApiError = require('../utils/ApiError');

// Lists always return { results, count }, so "no results" is just count 0, not an error.
const sendList = (res, results) =>
  res.json({ success: true, data: { count: results.length, results } });

// GET /api/meals/search?q=
async function search(req, res) {
  const { q } = matchedData(req);
  sendList(res, await mealdb.searchByName(q));
}

// GET /api/meals/ingredient?i=
async function byIngredient(req, res) {
  const { i } = matchedData(req);
  sendList(res, await mealdb.filterByIngredient(i));
}

// GET /api/meals/category?c=
async function byCategory(req, res) {
  const { c } = matchedData(req);
  sendList(res, await mealdb.filterByCategory(c));
}

// GET /api/meals/area?a=
async function byArea(req, res) {
  const { a } = matchedData(req);
  sendList(res, await mealdb.filterByArea(a));
}

// GET /api/meals/random
async function random(req, res) {
  const meal = await mealdb.getRandomMeal();
  if (!meal) throw ApiError.badGateway('TheMealDB did not return a meal');
  res.json({ success: true, data: { meal } });
}

// GET /api/meals/categories
async function categories(req, res) {
  sendList(res, await mealdb.listCategories());
}

// GET /api/meals/:id
async function getById(req, res) {
  const { id } = matchedData(req);
  const meal = await mealdb.getMealById(id);
  if (!meal) throw ApiError.notFound(`No meal found with id ${id}`);
  res.json({ success: true, data: { meal } });
}

module.exports = { search, byIngredient, byCategory, byArea, random, categories, getById };
