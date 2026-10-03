const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Analytics endpoints: MANAGER, REPORTING, ADMIN
router.use(requireAuth, requireRole('MANAGER', 'REPORTING', 'ADMIN'));

// GET /api/v1/analytics/dashboard
router.get('/dashboard', analyticsController.dashboard);

// GET /api/v1/analytics/indicator-trend
router.get('/indicator-trend', analyticsController.indicatorTrend);

// GET /api/v1/analytics/indicator-comparison
router.get('/indicator-comparison', analyticsController.indicatorComparison);

module.exports = router;
