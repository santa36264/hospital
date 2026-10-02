/**
 * Stage 08 — Report Service
 *
 * All report functions:
 *   1. Validate IDs server-side.
 *   2. Only surface APPROVED submissions for finalized reports.
 *   3. Record access in report_history (fire-and-forget).
 *   4. Never modify submission data.
 */

const ApiError = require('../errors/ApiError');
const reportRepository = require('../repositories/reportRepository');
const datasetRepository = require('../repositories/datasetRepository');
const reportingPeriodRepository = require('../repositories/reportingPeriodRepository');
const indicatorRepository = require('../repositories/indicatorRepository');

// ─── Dataset Report ───────────────────────────────────────────────────────────

async function datasetReport({ datasetId, reportingPeriodId }, user) {
  if (!datasetId || !reportingPeriodId) {
    throw new ApiError(422, 'dataset_id and reporting_period_id are required.');
  }

  const dataset = await datasetRepository.findById(datasetId);
  if (!dataset) throw new ApiError(404, 'Dataset not found.');

  const period = await reportingPeriodRepository.findById(reportingPeriodId);
  if (!period) throw new ApiError(404, 'Reporting period not found.');

  // Fetch approved submission (null if none)
  const submission = await reportRepository.getApprovedSubmission(datasetId, reportingPeriodId);

  // All active indicators for the dataset
  const indicators = await reportRepository.getDatasetIndicators(datasetId);

  // Values map: indicator_id -> value (only if there's an approved submission)
  let valuesMap = {};
  if (submission) {
    const values = await reportRepository.getSubmissionValues(submission.id);
    for (const v of values) valuesMap[v.indicator_id] = v;
  }

  // Record history (non-blocking)
  reportRepository.recordHistory({
    userId: user.id,
    reportType: 'DATASET_REPORT',
    datasetId,
    reportingPeriodId,
  });

  return {
    dataset,
    period,
    submission: submission || null,
    indicators,
    valuesMap,
  };
}

// ─── Monthly Report ───────────────────────────────────────────────────────────

async function monthlyReport({ reportingPeriodId }, user) {
  if (!reportingPeriodId) {
    throw new ApiError(422, 'reporting_period_id is required.');
  }

  const period = await reportingPeriodRepository.findById(reportingPeriodId);
  if (!period) throw new ApiError(404, 'Reporting period not found.');

  const { datasets, subByDataset } = await reportRepository.getMonthlyReport(reportingPeriodId);

  // Record history
  reportRepository.recordHistory({
    userId: user.id,
    reportType: 'MONTHLY_REPORT',
    reportingPeriodId,
  });

  // Build rows: each active dataset + its approval status
  const rows = datasets.map(ds => ({
    dataset: ds,
    approvedSubmission: subByDataset[ds.id] || null,
  }));

  const approvedCount = rows.filter(r => r.approvedSubmission).length;

  return {
    period,
    rows,
    summary: {
      totalDatasets: rows.length,
      approved: approvedCount,
      notApproved: rows.length - approvedCount,
    },
  };
}

// ─── Indicator Report ─────────────────────────────────────────────────────────

async function indicatorReport({ datasetId, indicatorId, reportingPeriodId }, user) {
  if (!datasetId || !indicatorId || !reportingPeriodId) {
    throw new ApiError(422, 'dataset_id, indicator_id, and reporting_period_id are required.');
  }

  const dataset = await datasetRepository.findById(datasetId);
  if (!dataset) throw new ApiError(404, 'Dataset not found.');

  const period = await reportingPeriodRepository.findById(reportingPeriodId);
  if (!period) throw new ApiError(404, 'Reporting period not found.');

  // Validates indicator belongs to dataset — returns null indicator if mismatch
  const { indicator, submission, value } = await reportRepository.getIndicatorReport(
    datasetId,
    indicatorId,
    reportingPeriodId
  );

  if (!indicator) {
    throw new ApiError(404, 'Indicator not found or does not belong to the selected dataset.');
  }

  // Record history
  reportRepository.recordHistory({
    userId: user.id,
    reportType: 'INDICATOR_REPORT',
    datasetId,
    reportingPeriodId,
    indicatorId,
  });

  return { dataset, period, indicator, submission: submission || null, value };
}

// ─── Submission Status Report ─────────────────────────────────────────────────

async function submissionStatusReport(
  { datasetId, reportingPeriodId, status, search, page, perPage },
  user
) {
  // Validate optional IDs
  if (datasetId) {
    const ds = await datasetRepository.findById(datasetId);
    if (!ds) throw new ApiError(404, 'Dataset not found.');
  }
  if (reportingPeriodId) {
    const pr = await reportingPeriodRepository.findById(reportingPeriodId);
    if (!pr) throw new ApiError(404, 'Reporting period not found.');
  }

  const validStatuses = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'RETURNED', 'APPROVED'];
  if (status && !validStatuses.includes(status)) {
    throw new ApiError(422, 'Invalid status filter.');
  }

  const result = await reportRepository.getSubmissionStatus({
    datasetId,
    reportingPeriodId,
    status,
    search,
    page: page ? Number(page) : 1,
    perPage: perPage ? Math.min(Number(perPage), 200) : 50,
  });

  // Record history (non-blocking)
  reportRepository.recordHistory({
    userId: user.id,
    reportType: 'SUBMISSION_STATUS_REPORT',
    datasetId: datasetId || null,
    reportingPeriodId: reportingPeriodId || null,
    parameters: { status, search },
  });

  return result;
}

// ─── Report History ───────────────────────────────────────────────────────────

async function getReportHistory({ userId, page, perPage } = {}) {
  return reportRepository.getHistory({
    userId,
    page: page ? Number(page) : 1,
    perPage: perPage ? Math.min(Number(perPage), 100) : 50,
  });
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  datasetReport,
  monthlyReport,
  indicatorReport,
  submissionStatusReport,
  getReportHistory,
};
