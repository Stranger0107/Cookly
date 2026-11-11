/**
 * Builds and configures the Express app, but does NOT start listening.
 * Keeping app and server separate lets tests import the app and fire
 * requests at it with Supertest without opening a real port.
 */
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { env } = require('./config/env');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// --- Security middleware ---------------------------------------------------
app.use(helmet()); // sets safe HTTP headers (no X-Powered-By, CSP, etc.)

app.use(
  cors({
    origin: env.clientUrls, // only our frontend(s) may call the API from a browser
    credentials: true,
  })
);

// Basic protection against brute force / abuse: 100 requests per 15 min per IP.
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => env.isTest,
    message: { success: false, message: 'Too many requests, please try again later' },
  })
);

// --- Parsing & logging -----------------------------------------------------
app.use(express.json({ limit: '100kb' })); // parse JSON bodies, reject huge payloads
app.use(express.urlencoded({ extended: false }));

if (!env.isTest) {
  app.use(morgan(env.isProduction ? 'combined' : 'dev'));
}

// --- Routes ----------------------------------------------------------------
app.get('/', (req, res) => {
  res.json({ success: true, data: { name: 'Pantry Chef API', docs: '/api/health' } });
});

app.use('/api', apiRoutes);

// --- Errors (must be registered last) --------------------------------------
app.use(notFound);
app.use(errorHandler);

module.exports = app;
