/**
 * Stage 08 — Report Controller
 * HTTP layer only; all logic in reportService.
 */

const reportService = require('../services/reportService');

async function datasetReport(req, res, next) {
  try {
    const data = await reportService.datasetReport(
      {
        datasetId: req.query.dataset_id ? Number(req.query.dataset_id) : undefined,
        reportingPeriodId: req.query.reporting_period_id
          ? Number(req.query.reporting_period_id)
          : undefined,
      },
      req.user
    );
    res.json({ success: true, message: 'Dataset report generated.', data });
  } catch (err) {
    next(err);
  }
}

async function monthlyReport(req, res, next) {
  try {
    const data = await reportService.monthlyReport(
      {
        reportingPeriodId: req.query.reporting_period_id
          ? Number(req.query.reporting_period_id)
          : undefined,
      },
      req.user
    );
    res.json({ success: true, message: 'Monthly report generated.', data });
  } catch (err) {
    next(err);
  }
}

async function indicatorReport(req, res, next) {
  try {
    const data = await reportService.indicatorReport(
      {
        datasetId: req.query.dataset_id ? Number(req.query.dataset_id) : undefined,
        indicatorId: req.query.indicator_id ? Number(req.query.indicator_id) : undefined,
        reportingPeriodId: req.query.reporting_period_id
          ? Number(req.query.reporting_period_id)
          : undefined,
      },
      req.user
    );
    res.json({ success: true, message: 'Indicator report generated.', data });
  } catch (err) {
    next(err);
  }
}

async function submissionStatusReport(req, res, next) {
  try {
    const data = await reportService.submissionStatusReport(
      {
        datasetId: req.query.dataset_id ? Number(req.query.dataset_id) : undefined,
        reportingPeriodId: req.query.reporting_period_id
          ? Number(req.query.reporting_period_id)
          : undefined,
        status: req.query.status || undefined,
        search: req.query.search || undefined,
        page: req.query.page,
        perPage: req.query.per_page,
      },
      req.user
    );
    res.json({ success: true, message: 'Submission status report generated.', data: data.data, meta: data.meta });
  } catch (err) {
    next(err);
  }
}

async function reportHistory(req, res, next) {
  try {
    const result = await reportService.getReportHistory({
      userId: req.user.id,
      page: req.query.page,
      perPage: req.query.per_page,
    });
    res.json({ success: true, message: 'Report history retrieved.', data: result.data, meta: result.meta });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  datasetReport,
  monthlyReport,
  indicatorReport,
  submissionStatusReport,
  reportHistory,
};
