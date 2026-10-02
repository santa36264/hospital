const express = require('express');
const datasetController = require('../controllers/datasetController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', datasetController.list);
router.post('/', datasetController.create);
router.get('/:id', datasetController.getById);
router.patch('/:id', datasetController.update);
router.patch('/:id/status', datasetController.setStatus);

module.exports = router;
