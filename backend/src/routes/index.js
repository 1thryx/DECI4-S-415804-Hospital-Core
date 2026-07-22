const express = require('express');
const mongoose = require('mongoose');
const statsController = require('../controllers/statsController');

const router = express.Router();

// Liveness/readiness probe — used by docker-compose healthchecks and k8s probes.
router.get('/health', (req, res) => {
  const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState];
  const healthy = mongoose.connection.readyState === 1;
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    service: 'hospital-core-api',
    version: process.env.npm_package_version || '1.0.0',
    database: dbState,
    appointmentService: process.env.APPOINTMENT_SERVICE_URL ? 'delegated' : 'embedded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

router.use('/patients', require('./patientRoutes'));
router.use('/doctors', require('./doctorRoutes'));
router.use('/appointments', require('./appointmentRoutes'));
router.get('/stats/dashboard', statsController.dashboardStats);
router.get('/stats/patient-flow', statsController.patientFlow);

module.exports = router;
