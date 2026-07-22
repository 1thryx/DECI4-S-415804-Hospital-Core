const mongoose = require('mongoose');
const { ensureConnection } = require('../src/config/db');

/**
 * Regression cover for the serverless connection cache.
 *
 * ensureConnection memoises its connection promise so concurrent requests share one
 * dial-up. The failure mode this guards against: once that promise resolved, it
 * stayed resolved forever — so after the platform froze the function and the socket
 * died, ensureConnection returned "success" instantly while readyState sat at 0 and
 * nothing ever reconnected. The API reported "disconnected" permanently.
 */
describe('ensureConnection', () => {
  it('resolves immediately when already connected', async () => {
    expect(mongoose.connection.readyState).toBe(1);
    await ensureConnection(global.__MONGO_URI__);
    expect(mongoose.connection.readyState).toBe(1);
  });

  it('redials after the connection drops rather than reusing a stale promise', async () => {
    // Prime the cache with a successful connection.
    await ensureConnection(global.__MONGO_URI__);
    expect(mongoose.connection.readyState).toBe(1);

    // Simulate the socket dying while the process was frozen.
    await mongoose.connection.close();
    expect(mongoose.connection.readyState).toBe(0);

    // Must establish a fresh connection, not hand back the stale resolved promise.
    await ensureConnection(global.__MONGO_URI__);
    expect(mongoose.connection.readyState).toBe(1);
  });

  it('surfaces the failure and allows a later retry to succeed', async () => {
    await mongoose.connection.close();

    await expect(
      ensureConnection('mongodb://127.0.0.1:1/nope?serverSelectionTimeoutMS=500')
    ).rejects.toThrow();

    // A failed attempt must not poison the cache — the next call dials again.
    await ensureConnection(global.__MONGO_URI__);
    expect(mongoose.connection.readyState).toBe(1);
  });
});
