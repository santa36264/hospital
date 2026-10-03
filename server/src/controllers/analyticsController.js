/**
 * Stage 10 — Analytics Controller
 * HTTP layer only; all logic in analyticsService.
 */

const analyticsService = require('../services/analyticsService');

async function dashboard(req, res, next) {
  try {
    const data = await analyticsService.getDashboard({
      reportingPeriodId: req.query.reporting_period_id
        ? Number(req.query.reporting_period_id) : undefined,
      datasetId: req.query.dataset_id
        ? Number(req.query.dataset_id) : undefined,
    });
    res.json({ success: true, message: 'Dashboard data retrieved.', data });
  } catch (err) { next(err); }
}

async function indicatorTrend(req, res, next) {
  try {
    const data = await analyticsService.getIndicatorTrend({
      datasetId:     req.query.dataset_id     ? Number(req.query.dataset_id)     : undefined,
      indicatorId:   req.query.indicator_id   ? Number(req.query.indicator_id)   : undefined,
      startPeriodId: req.query.start_period_id ? Number(req.query.start_period_id) : undefined,
      endPeriodId:   req.query.end_period_id   ? Number(req.query.end_period_id)   : undefined,
    });
    res.json({ success: true, message: 'Indicator trend retrieved.', data });
  } catch (err) { next(err); }
}

async function indicatorComparison(req, res, next) {
  try {
    const data = await analyticsService.getIndicatorComparison({
      datasetId:   req.query.dataset_id   ? Number(req.query.dataset_id)   : undefined,
      indicatorId: req.query.indicator_id ? Number(req.query.indicator_id) : undefined,
      periodAId:   req.query.period_a     ? Number(req.query.period_a)     : undefined,
      periodBId:   req.query.period_b     ? Number(req.query.period_b)     : undefined,
    });
    res.json({ success: true, message: 'Indicator comparison retrieved.', data });
  } catch (err) { next(err); }
}

module.exports = { dashboard, indicatorTrend, indicatorComparison };
