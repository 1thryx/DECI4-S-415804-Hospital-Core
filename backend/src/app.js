const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

/**
 * The Express app is built separately from the listener so tests can mount it with
 * supertest against an in-memory Mongo instance without binding a port.
 */
function createApp() {
  const app = express();

  app.set('trust proxy', 1); // behind the k8s ingress / Vercel edge
  app.use(helmet());
  app.use(
    cors({
      origin: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(','),
      credentials: true
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: process.env.NODE_ENV === 'test' ? 100000 : 500,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: 'Too many requests — slow down.' }
    })
  );

  app.get('/', (req, res) =>
    res.json({ service: 'Hospital Core API', docs: '/api/health', version: process.env.npm_package_version || '1.0.0' })
  );

  app.use('/api', routes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
