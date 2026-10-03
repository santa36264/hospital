const express = require('express');
const adminAuditController = require('../controllers/adminAuditController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/', adminAuditController.list);

module.exports = router;
