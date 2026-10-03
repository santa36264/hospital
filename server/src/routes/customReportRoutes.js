const express = require('express');
const customReportController = require('../controllers/customReportController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(requireAuth, requireRole('REPORTING', 'ADMIN'));

// POST /api/v1/reports/custom/preview
router.post('/preview', customReportController.preview);

// POST /api/v1/reports/custom/export/pdf
router.post('/export/pdf', customReportController.exportPdf);

// POST /api/v1/reports/custom/export/excel
router.post('/export/excel', customReportController.exportExcel);

module.exports = router;
