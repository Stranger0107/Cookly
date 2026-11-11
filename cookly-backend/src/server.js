/**
 * Entry point: validate config, connect to MongoDB, then start HTTP server.
 * Also handles graceful shutdown so in-flight requests finish and the
 * DB connection closes cleanly when the process is stopped (Ctrl+C, deploys).
 */
const { env, validateEnv } = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const app = require('./app');

async function start() {
  try {
    validateEnv();
    await connectDB(env.mongoUri);

    const server = app.listen(env.port, () => {
      console.log(`Cookly API running on http://localhost:${env.port} (${env.nodeEnv})`);
    });

    const shutdown = (signal) => {
      console.log(`${signal} received, shutting down...`);
      server.close(async () => {
        await disconnectDB();
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

// Last line of defence: log and exit on errors nobody handled.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  process.exit(1);
});

start();
