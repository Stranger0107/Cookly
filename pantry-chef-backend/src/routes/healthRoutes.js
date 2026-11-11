/**
 * GET /api/health
 * A tiny endpoint that load balancers, uptime monitors and you (while
 * developing) can hit to check the server is alive and the DB is connected.
 */
const express = require('express');
const { dbStatus } = require('../config/db');

const router = express.Router();

router.get('/', (req, res) => {
  const database = dbStatus();

  res.status(database === 'connected' ? 200 : 503).json({
    success: database === 'connected',
    data: {
      status: database === 'connected' ? 'ok' : 'degraded',
      database,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});

module.exports = router;
