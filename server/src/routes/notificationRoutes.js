const express = require('express');
const notificationController = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// All notification endpoints require authentication (any role).
router.use(requireAuth);

// GET  /api/v1/notifications            — list user's notifications
router.get('/', notificationController.list);

// GET  /api/v1/notifications/unread-count  — count unread for badge
router.get('/unread-count', notificationController.unreadCount);

// PATCH /api/v1/notifications/:id/read  — mark one read
router.patch('/:id/read', notificationController.markRead);

// PATCH /api/v1/notifications/read-all  — mark all read
router.patch('/read-all', notificationController.markAllRead);

module.exports = router;
