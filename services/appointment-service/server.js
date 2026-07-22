require('dotenv').config();
const mongoose = require('mongoose');
const { createApp } = require('./src/app');

const PORT = process.env.PORT || 5001;
const MONGO_URI = process.env.MONGO_URI;

async function start() {
  if (!MONGO_URI) throw new Error('MONGO_URI is not defined for appointment-service');

  mongoose.set('strictQuery', true);
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 10000 });
  console.log(`[appointment-service] MongoDB connected: ${mongoose.connection.name}`);

  const server = createApp().listen(PORT, () => console.log(`[appointment-service] listening on :${PORT}`));

  const shutdown = () => server.close(() => mongoose.connection.close().then(() => process.exit(0)));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

if (require.main === module) {
  start().catch((err) => {
    console.error('[appointment-service] Failed to start:', err.message);
    process.exit(1);
  });
}

module.exports = { start };
