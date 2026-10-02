const express = require('express');
const indicatorController = require('../controllers/indicatorController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', indicatorController.list);
router.post('/', indicatorController.create);
router.get('/:id', indicatorController.getById);
router.patch('/:id', indicatorController.update);
router.patch('/:id/status', indicatorController.setStatus);

module.exports = router;
