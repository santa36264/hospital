const express = require('express');
const reviewController = require('../controllers/reviewController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// All review endpoints require authentication and REPORTING role.
router.use(requireAuth, requireRole('REPORTING'));

// GET  /api/v1/review/queue              — submission queue (SUBMITTED + UNDER_REVIEW)
router.get('/queue', reviewController.listQueue);

// GET  /api/v1/review/submissions/:id    — full submission detail for reviewer
router.get('/submissions/:id', reviewController.getDetail);

// POST /api/v1/review/submissions/:id/start    — SUBMITTED → UNDER_REVIEW
router.post('/submissions/:id/start', reviewController.startReview);

// POST /api/v1/review/submissions/:id/approve  — UNDER_REVIEW → APPROVED
router.post('/submissions/:id/approve', reviewController.approve);

// POST /api/v1/review/submissions/:id/return   — UNDER_REVIEW → RETURNED (reason required)
router.post('/submissions/:id/return', reviewController.returnSubmission);

module.exports = router;
