/**
 * MongoDB connection helpers.
 * Mongoose keeps one connection pool for the whole app, so we connect once
 * at startup (server.js) and reuse it everywhere through the models.
 */
const mongoose = require('mongoose');

async function connectDB(uri) {
  // Ignore filter fields that aren't in the schema (e.g. find({ typo: 1 })).
  mongoose.set('strictQuery', true);

  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000, // give up after 10s if Mongo is unreachable
  });

  console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);

  mongoose.connection.on('error', (err) => console.error('MongoDB error:', err.message));
  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));

  return conn;
}

async function disconnectDB() {
  await mongoose.connection.close();
}

// Human-readable connection state, used by the health check.
function dbStatus() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] || 'unknown';
}

module.exports = { connectDB, disconnectDB, dbStatus };
