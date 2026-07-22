require('dotenv').config();
const { createApp } = require('./src/app');
const { connectDB } = require('./src/config/db');

const PORT = process.env.PORT || 5000;
const app = createApp();

// Vercel imports the app as a serverless handler; only bind a port when run directly.
if (require.main === module) {
  connectDB()
    .then(() => {
      const server = app.listen(PORT, () => console.log(`[api] Hospital Core listening on :${PORT}`));

      const shutdown = (signal) => {
        console.log(`[api] ${signal} received — draining connections`);
        server.close(() => process.exit(0));
      };
      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGINT', () => shutdown('SIGINT'));
    })
    .catch((err) => {
      console.error('[api] Failed to start:', err.message);
      process.exit(1);
    });
} else {
  // Imported rather than run directly — i.e. a serverless handler. Kick the
  // connection off now so a cold start has a head start, but correctness does not
  // depend on it: the /api middleware in src/app.js awaits ensureConnection() on
  // every request and retries if this attempt failed.
  connectDB().catch((err) => console.error('[api] initial connection attempt failed:', err.message));
}

module.exports = app;
