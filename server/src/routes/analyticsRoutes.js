const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// ── DATA_ENTRY dashboard — DATA_ENTRY only ────────────────────────────────────
// Must be before the general requireRole middleware so DATA_ENTRY can reach it.
router.get(
  '/data-entry-dashboard',
  requireAuth,
  requireRole('DATA_ENTRY'),
  analyticsController.dataEntryDashboard
);

// ── REPORTING dashboard — REPORTING and ADMIN ─────────────────────────────────
router.get(
  '/reporting-dashboard',
  requireAuth,
  requireRole('REPORTING', 'ADMIN'),
  analyticsController.reportingDashboard
);

// ── All remaining analytics: MANAGER, REPORTING, ADMIN ────────────────────────
// Applied per-route (not router.use) to avoid blocking the routes above.
const managerAuth = [requireAuth, requireRole('MANAGER', 'REPORTING', 'ADMIN')];

router.get('/dashboard', ...managerAuth, analyticsController.dashboard);
router.get('/indicator-trend', ...managerAuth, analyticsController.indicatorTrend);
router.get('/indicator-comparison', ...managerAuth, analyticsController.indicatorComparison);

module.exports = router;
