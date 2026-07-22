const express = require('express');
const { body } = require('express-validator');
const c = require('../controllers/patientController');
const { audit } = require('../middleware/audit');
const validate = require('../middleware/validate');

const router = express.Router();
router.use(audit('Patient'));

const createRules = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('A valid email is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('dateOfBirth').isISO8601().withMessage('dateOfBirth must be an ISO date')
];

router.route('/').get(c.listPatients).post(createRules, validate, c.createPatient);
router.route('/:id').get(c.getPatient).put(c.updatePatient).delete(c.deletePatient);
router
  .route('/:id/history')
  .get(c.getHistory)
  .post(
    [body('type').notEmpty().withMessage('type is required'), body('title').trim().notEmpty().withMessage('title is required')],
    validate,
    c.addHistory
  );

module.exports = router;
