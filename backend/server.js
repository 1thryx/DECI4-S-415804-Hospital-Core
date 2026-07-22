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
} else if (process.env.VERCEL) {
  // Serverless: connect lazily, reusing the connection across warm invocations.
  connectDB().catch((err) => console.error('[api] Atlas connection failed:', err.message));
}

module.exports = app;
