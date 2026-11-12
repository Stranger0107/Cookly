/**
 * Run the API without installing MongoDB.
 *
 *   npm run dev:memory
 *
 * Starts a local MongoDB with mongodb-memory-server (the same tool the tests
 * use) and then boots the normal server pointed at it. Data is stored in
 * cookly-backend/.data so it survives restarts; delete that folder to reset.
 *
 * For real deployments use a proper MONGO_URI (local MongoDB or Atlas).
 */
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

const DB_PATH = path.resolve(__dirname, '../.data');

async function main() {
  fs.mkdirSync(DB_PATH, { recursive: true });

  const mongo = await MongoMemoryServer.create({
    instance: { dbPath: DB_PATH, storageEngine: 'wiredTiger', dbName: 'cookly' },
    // Reuse the MongoDB binary in this package's node_modules even when the
    // script is started from another folder (e.g. `npm --prefix cookly-backend`).
    binary: { downloadDir: path.resolve(__dirname, '../node_modules/.cache/mongodb-memory-server') },
  });

  process.env.MONGO_URI = mongo.getUri('cookly');
  // Convenience default for local demos only; set a real secret in .env.
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'local-dev-secret-change-me-before-deploying';

  console.log(`Local MongoDB running (data in ${DB_PATH})`);

  const stop = async () => {
    await mongo.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  require('../src/server');
}

main().catch((err) => {
  console.error('Could not start local MongoDB:', err.message);
  process.exit(1);
});
