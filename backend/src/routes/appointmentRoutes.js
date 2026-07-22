const express = require('express');
const { body } = require('express-validator');
const c = require('../controllers/appointmentController');
const { audit } = require('../middleware/audit');
const validate = require('../middleware/validate');

const router = express.Router();
router.use(audit('Appointment'));

const bookingRules = [
  body('patient').notEmpty().withMessage('patient id is required'),
  body('doctor').notEmpty().withMessage('doctor id is required'),
  body('scheduledFor').isISO8601().withMessage('scheduledFor must be an ISO date'),
  body('reason').trim().notEmpty().withMessage('reason is required')
];

router.route('/').get(c.listAppointments).post(bookingRules, validate, c.createAppointment);
router.route('/:id').get(c.getAppointment).put(c.rescheduleAppointment).delete(c.cancelAppointment);
router.patch('/:id/status', c.updateStatus);

module.exports = router;
