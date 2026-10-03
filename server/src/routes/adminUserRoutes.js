const express = require('express');
const adminUserController = require('../controllers/adminUserController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', adminUserController.list);
router.get('/:id', adminUserController.getById);
router.post('/', adminUserController.create);
router.patch('/:id', adminUserController.update);
router.post('/:id/password', adminUserController.password);
router.post('/:id/activate', adminUserController.activate);
router.post('/:id/deactivate', adminUserController.deactivate);

module.exports = router;
