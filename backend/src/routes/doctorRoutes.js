const express = require('express');
const { body } = require('express-validator');
const c = require('../controllers/doctorController');
const { audit } = require('../middleware/audit');
const validate = require('../middleware/validate');

const router = express.Router();
router.use(audit('Doctor'));

const createRules = [
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('specialty').notEmpty().withMessage('specialty is required'),
  body('licenseNumber').trim().notEmpty().withMessage('licenseNumber is required'),
  body('email').isEmail()
];

router.route('/').get(c.listDoctors).post(createRules, validate, c.createDoctor);
router.route('/:id').get(c.getDoctor).put(c.updateDoctor);
router.get('/:id/schedule', c.getSchedule);

module.exports = router;
