const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const bookingRoutes = require('./routes/bookingRoutes');

function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: (process.env.CORS_ORIGINS || '*').split(',') }));
  app.use(express.json());
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.get('/health', (req, res) => {
    const healthy = mongoose.connection.readyState === 1;
    res.status(healthy ? 200 : 503).json({
      success: healthy,
      service: 'appointment-service',
      database: healthy ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  app.use('/appointments', bookingRoutes);

  app.use((req, res) => res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.originalUrl}` }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.statusCode || (err.code === 11000 ? 409 : 500);
    if (status >= 500) console.error('[appointment-service]', err);
    res.status(status).json({
      success: false,
      error: err.code === 11000 ? 'That slot is already booked for this doctor' : err.message
    });
  });

  return app;
}

module.exports = { createApp };
