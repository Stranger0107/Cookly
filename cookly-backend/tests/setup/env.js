/**
 * Runs before every test file, BEFORE any app code is imported, so
 * src/config/env.js picks up these values instead of your real .env.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-hs256-signing';
process.env.JWT_EXPIRES_IN = '1h';
process.env.MEALDB_BASE_URL = 'https://mealdb.test/api/json/v1/1'; // never really called: tests mock it
