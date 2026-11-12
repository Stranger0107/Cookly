/**
 * Loads environment variables once and exposes them as a typed config object.
 * Every other file imports from here instead of reading process.env directly,
 * so there is a single place to see (and validate) what the app needs.
 */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  mealdbBaseUrl: process.env.MEALDB_BASE_URL || 'https://www.themealdb.com/api/json/v1/1',
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),
  // Built React app (`npm run build` in cookly-frontend). If it exists, the API serves it too.
  clientDist: process.env.CLIENT_DIST || path.resolve(__dirname, '../../../cookly-frontend/dist'),
};

env.isProduction = env.nodeEnv === 'production';
env.isTest = env.nodeEnv === 'test';

/**
 * Fail fast: if a required variable is missing we want to crash at startup
 * with a clear message, not later with a confusing error deep in a request.
 * Tests set their own values, so we skip the check there.
 */
function validateEnv() {
  if (env.isTest) return;

  const required = ['MONGO_URI', 'JWT_SECRET'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

module.exports = { env, validateEnv };
