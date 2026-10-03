/**
 * Stage 09 — Custom Report Controller
 * HTTP layer only; all logic in customReportService and export services.
 */

const customReportService = require('../services/customReportService');
const pdfReportService = require('../services/export/pdfReportService');
const excelReportService = require('../services/export/excelReportService');

function parseBody(body = {}) {
  return {
    datasetId: body.dataset_id ? Number(body.dataset_id) : undefined,
    indicatorIds: Array.isArray(body.indicator_ids)
      ? body.indicator_ids.map(Number)
      : [],
    periodIds: Array.isArray(body.reporting_period_ids)
      ? body.reporting_period_ids.map(Number)
      : [],
  };
}

// POST /api/v1/reports/custom/preview
async function preview(req, res, next) {
  try {
    const { datasetId, indicatorIds, periodIds } = parseBody(req.body);
    const data = await customReportService.previewCustomReport(
      { datasetId, indicatorIds, periodIds },
      req.user
    );
    res.json({ success: true, message: 'Custom report generated.', data });
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/reports/custom/export/pdf
async function exportPdf(req, res, next) {
  try {
    const { datasetId, indicatorIds, periodIds } = parseBody(req.body);
    // Re-build report data from DB — never trust frontend values
    const reportData = await customReportService.buildReportData(
      datasetId,
      indicatorIds,
      periodIds
    );

    const filename = `custom-report-${reportData.dataset.code}-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    pdfReportService.generatePDF(reportData, res);
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/reports/custom/export/excel
async function exportExcel(req, res, next) {
  try {
    const { datasetId, indicatorIds, periodIds } = parseBody(req.body);
    const reportData = await customReportService.buildReportData(
      datasetId,
      indicatorIds,
      periodIds
    );

    const filename = `custom-report-${reportData.dataset.code}-${Date.now()}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await excelReportService.generateExcel(reportData, res);
  } catch (err) {
    next(err);
  }
}

module.exports = { preview, exportPdf, exportExcel };
