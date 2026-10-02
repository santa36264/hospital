const express = require('express');
const reportingPeriodController = require('../controllers/reportingPeriodController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', reportingPeriodController.list);
router.post('/', reportingPeriodController.create);
router.get('/:id', reportingPeriodController.getById);
router.patch('/:id', reportingPeriodController.update);
router.patch('/:id/status', reportingPeriodController.setStatus);

module.exports = router;
