const express = require('express');
const c = require('../controllers/bookingController');

const router = express.Router();

router.route('/').get(c.list).post(c.book);
router.route('/:id').get(c.get).put(c.reschedule).delete(c.cancel);
router.patch('/:id/status', c.updateStatus);

module.exports = router;
