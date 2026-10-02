const express = require('express');
const reportController = require('../controllers/reportController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// All report endpoints require authentication.
router.use(requireAuth);

// Dataset Report — REPORTING and ADMIN
router.get(
  '/dataset',
  requireRole('REPORTING', 'ADMIN'),
  reportController.datasetReport
);

// Monthly Report — REPORTING and ADMIN
router.get(
  '/monthly',
  requireRole('REPORTING', 'ADMIN'),
  reportController.monthlyReport
);

// Indicator Report — REPORTING and ADMIN
router.get(
  '/indicator',
  requireRole('REPORTING', 'ADMIN'),
  reportController.indicatorReport
);

// Submission Status Report — REPORTING and ADMIN
router.get(
  '/submission-status',
  requireRole('REPORTING', 'ADMIN'),
  reportController.submissionStatusReport
);

// Report History — own history for authenticated user (REPORTING and ADMIN)
router.get(
  '/history',
  requireRole('REPORTING', 'ADMIN'),
  reportController.reportHistory
);

module.exports = router;
