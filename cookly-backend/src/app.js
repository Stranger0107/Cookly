/**
 * Builds and configures the Express app, but does NOT start listening.
 * Keeping app and server separate lets tests import the app and fire
 * requests at it with Supertest without opening a real port.
 *
 * In production the same app also serves the built React frontend, so one
 * server (one URL) hosts both: /api/* is the API, everything else is the app.
 */
const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { env } = require('./config/env');
const apiRoutes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Hosts like Render put a proxy in front of the app. Trusting the first proxy
// makes req.ip the real visitor's IP, so rate limiting is per user, not global.
if (env.isProduction) app.set('trust proxy', 1);

const clientIndex = path.join(env.clientDist, 'index.html');
const serveClient = !env.isTest && fs.existsSync(clientIndex);

// --- Security middleware ---------------------------------------------------
// helmet sets safe HTTP headers. The Content-Security-Policy says which
// outside sources the frontend may load: Google Fonts, recipe photos (any
// https image, since users can paste their own) and YouTube embeds.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'https:'],
        frameSrc: ['https://www.youtube-nocookie.com'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: env.isProduction ? [] : null,
      },
    },
  })
);

app.use(
  cors({
    origin: env.clientUrls, // only our frontend(s) may call the API from a browser
    credentials: true,
  })
);

// Basic protection against abuse, per IP. One dashboard load fires ~6 calls,
// so the limit leaves room for normal browsing; login/register have their own
// much tighter limit (see authRoutes).
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.isProduction ? 300 : 1000,
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
app.use('/api', apiRoutes);

if (serveClient) {
  // Vite puts content-hashed files in /assets, so they can be cached "forever".
  app.use(
    '/assets',
    express.static(path.join(env.clientDist, 'assets'), { immutable: true, maxAge: '1y' })
  );
  app.use(express.static(env.clientDist, { index: false }));

  // Any other non-API URL (/home, /recipes/123...) gets index.html and React
  // Router takes over in the browser. index.html itself is never cached, so
  // a new deploy is picked up on the next page load.
  app.get('/{*path}', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.set('Cache-Control', 'no-cache');
    res.sendFile(clientIndex);
  });
} else {
  app.get('/', (req, res) => {
    res.json({ success: true, data: { name: 'Cookly API', docs: '/api/health' } });
  });
}

// --- Errors (must be registered last) --------------------------------------
app.use(notFound);
app.use(errorHandler);

module.exports = app;
