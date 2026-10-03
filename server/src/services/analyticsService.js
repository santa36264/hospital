/**
 * Stage 10 — Analytics Service
 * Read-only. APPROVED data only. Never modifies submissions.
 */

const ApiError = require('../errors/ApiError');
const analyticsRepository = require('../repositories/analyticsRepository');
const datasetRepository = require('../repositories/datasetRepository');
const reportingPeriodRepository = require('../repositories/reportingPeriodRepository');
const indicatorRepository = require('../repositories/indicatorRepository');

// ─── Dashboard ────────────────────────────────────────────────────────────────

async function getDashboard({ reportingPeriodId, datasetId } = {}) {
  // Resolve period: use provided ID or fall back to latest available
  let period;
  if (reportingPeriodId) {
    period = await reportingPeriodRepository.findById(reportingPeriodId);
    if (!period) throw new ApiError(404, 'Reporting period not found.');
  } else {
    period = await analyticsRepository.getLatestPeriod();
    if (!period) throw new ApiError(404, 'No reporting periods found.');
  }

  // Optional dataset filter validation
  let dataset = null;
  if (datasetId) {
    dataset = await datasetRepository.findById(datasetId);
    if (!dataset) throw new ApiError(404, 'Dataset not found.');
  }

  const [coverage, datasetStatus, keyIndicators] = await Promise.all([
    analyticsRepository.getCoverageForPeriod(period.id, datasetId || null),
    analyticsRepository.getDatasetStatusForPeriod(period.id, datasetId || null),
    analyticsRepository.getKeyIndicators(period.id, datasetId || null, 30),
  ]);

  return {
    period,
    dataset: dataset || null,
    coverage,
    datasetStatus,
    keyIndicators,
  };
}

// ─── Indicator Trend ──────────────────────────────────────────────────────────

async function getIndicatorTrend({ datasetId, indicatorId, startPeriodId, endPeriodId }) {
  if (!datasetId || !indicatorId || !startPeriodId || !endPeriodId) {
    throw new ApiError(422, 'dataset_id, indicator_id, start_period_id, and end_period_id are required.');
  }

  const dataset = await datasetRepository.findById(datasetId);
  if (!dataset) throw new ApiError(404, 'Dataset not found.');

  const result = await analyticsRepository.getIndicatorTrend(
    datasetId, indicatorId, startPeriodId, endPeriodId
  );

  if (!result.indicator) {
    throw new ApiError(404, 'Indicator not found or does not belong to the selected dataset.');
  }

  return { dataset, ...result };
}

// ─── Indicator Comparison ─────────────────────────────────────────────────────

async function getIndicatorComparison({ datasetId, indicatorId, periodAId, periodBId }) {
  if (!datasetId || !indicatorId || !periodAId || !periodBId) {
    throw new ApiError(422, 'dataset_id, indicator_id, period_a, and period_b are required.');
  }

  const dataset = await datasetRepository.findById(datasetId);
  if (!dataset) throw new ApiError(404, 'Dataset not found.');

  const result = await analyticsRepository.getIndicatorComparison(
    datasetId, indicatorId, periodAId, periodBId
  );

  if (!result) {
    throw new ApiError(404, 'Indicator not found or periods not found.');
  }

  return { dataset, ...result };
}

module.exports = { getDashboard, getIndicatorTrend, getIndicatorComparison };

// ─── DATA_ENTRY Dashboard ─────────────────────────────────────────────────────

async function getDataEntryDashboard(userId) {
  const [stats, recentSubmissions] = await Promise.all([
    analyticsRepository.getDataEntryStats(userId),
    analyticsRepository.getRecentSubmissions(userId, 8),
  ]);
  return { stats, recentSubmissions };
}

// ─── REPORTING Dashboard ──────────────────────────────────────────────────────

async function getReportingDashboard() {
  const [stats, recentActivity] = await Promise.all([
    analyticsRepository.getReportingStats(),
    analyticsRepository.getRecentReviewActivity(10),
  ]);
  return { stats, recentActivity };
}

module.exports = Object.assign(module.exports, {
  getDataEntryDashboard,
  getReportingDashboard,
});
