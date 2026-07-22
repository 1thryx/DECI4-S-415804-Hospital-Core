const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

/**
 * Every test file gets a throwaway in-memory MongoDB. No local mongod required,
 * which is what lets the GitHub Actions job run the full suite unattended.
 */
let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  // Exposed so connection-lifecycle tests can redial the same server.
  global.__MONGO_URI__ = mongod.getUri();
  await mongoose.connect(global.__MONGO_URI__, { serverSelectionTimeoutMS: 30000 });
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongod) await mongod.stop();
});
