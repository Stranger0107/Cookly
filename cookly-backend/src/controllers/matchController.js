/**
 * POST /api/match - "What can I make with what I have?"
 * The controller only passes validated input to matchService.
 */
const { matchedData } = require('express-validator');
const { findMatches } = require('../services/matchService');

async function matchRecipes(req, res) {
  const { ingredients, includeMealDb, assumeStaples, limit } = matchedData(req, {
    locations: ['body'],
  });

  // Drop options the client didn't send so the service defaults apply.
  const options = Object.fromEntries(
    Object.entries({ includeMealDb, assumeStaples, limit }).filter(([, v]) => v !== undefined)
  );

  const data = await findMatches({ userId: req.user._id, ingredients, ...options });
  res.json({ success: true, data });
}

module.exports = { matchRecipes };
