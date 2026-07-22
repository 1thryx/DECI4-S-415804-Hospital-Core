const mongoose = require('mongoose');

/**
 * Connects to MongoDB. Works for a local docker-compose mongo container and for
 * a MongoDB Atlas SRV connection string in production — the driver picks the
 * right transport from the URI scheme, so only the env var changes.
 */
async function connectDB(uri = process.env.MONGO_URI) {
  if (!uri) throw new Error('MONGO_URI is not defined. Copy .env.example to .env.');

  mongoose.set('strictQuery', true);

  const conn = await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    // Atlas enforces TLS via the +srv scheme; these keep pooling sane under k8s replicas.
    maxPoolSize: 10,
    minPoolSize: 1
  });

  console.log(`[db] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
}

async function disconnectDB() {
  await mongoose.connection.close();
}

/**
 * Memoised connection for serverless runtimes.
 *
 * A Vercel function is frozen between invocations, so connecting once at module
 * load is not enough: if that single attempt fails, nothing ever retries and every
 * later request sees a dead connection. Caching the *promise* means concurrent
 * requests share one dial-up, warm invocations reuse the open socket, and a
 * failure clears the cache so the next request tries again.
 */
let connectionPromise = null;

function ensureConnection(uri = process.env.MONGO_URI) {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose.connection);

  if (!connectionPromise) {
    connectionPromise = connectDB(uri).catch((err) => {
      connectionPromise = null; // let the next request retry rather than fail forever
      throw err;
    });
  }

  return connectionPromise;
}

module.exports = { connectDB, disconnectDB, ensureConnection };
