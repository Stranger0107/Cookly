/**
 * Gives every test file its own throwaway MongoDB running in memory
 * (mongodb-memory-server), so tests never touch your real database and
 * don't need MongoDB installed.
 *
 * - beforeAll: start Mongo, connect, build indexes (unique email etc.)
 * - afterEach: wipe all collections so tests can't affect each other
 * - afterAll:  disconnect and stop Mongo
 */
const os = require('os');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), {
    // The MongoDB driver loads Node's `os` module with a dynamic import(), which
    // fails inside Jest's sandbox, so the connection handshake gets rejected
    // ("Missing required sub-document 'driver'"). Handing the module in
    // directly avoids that. Only needed in tests; the real server is unaffected.
    runtimeAdapters: { os },
  });
  // Models are registered once the test file imports the app; build their indexes.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
