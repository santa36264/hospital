const express = require('express');
const submissionController = require('../controllers/submissionController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// All submission endpoints require authentication and DATA_ENTRY role.
router.use(requireAuth, requireRole('DATA_ENTRY'));

// GET /api/v1/submissions/my  — list authenticated user's own submissions
router.get('/my', submissionController.listMy);

// GET /api/v1/submissions/:id  — get one submission (owner-only)
router.get('/:id', submissionController.getById);

// POST /api/v1/submissions  — create a new DRAFT submission
router.post('/', submissionController.create);

// PATCH /api/v1/submissions/:id  — save draft values
router.patch('/:id', submissionController.saveDraft);

// POST /api/v1/submissions/:id/submit  — submit (DRAFT|RETURNED → SUBMITTED)
router.post('/:id/submit', submissionController.submit);

module.exports = router;
