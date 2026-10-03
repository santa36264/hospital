/**
 * Stage 08 — Report Repository
 * All queries are READ-ONLY. Nothing here modifies submission data.
 */
const { db } = require('../config/database');

// ─── Dataset Report ───────────────────────────────────────────────────────────

/**
 * Returns the APPROVED submission for the given dataset + period,
 * joined with its data values and indicator definitions.
 */
async function getApprovedSubmission(datasetId, reportingPeriodId) {
  return db('submissions')
    .join('datasets', 'datasets.id', 'submissions.dataset_id')
    .join('reporting_periods', 'reporting_periods.id', 'submissions.reporting_period_id')
    .join('users', 'users.id', 'submissions.owner_user_id')
    .select(
      'submissions.id',
      'submissions.status',
      'submissions.submitted_at',
      'submissions.reviewed_at',
      'submissions.approved_at',
      'datasets.id as dataset_id',
      'datasets.name as dataset_name',
      'datasets.code as dataset_code',
      'reporting_periods.id as period_id',
      'reporting_periods.label as period_label',
      'reporting_periods.period_type',
      'reporting_periods.start_date',
      'reporting_periods.end_date',
      'users.name as owner_name',
      'users.email as owner_email'
    )
    .where('submissions.dataset_id', datasetId)
    .where('submissions.reporting_period_id', reportingPeriodId)
    .where('submissions.status', 'APPROVED')
    .first();
}

/**
 * Get all data values for a submission, with indicator metadata.
 */
async function getSubmissionValues(submissionId) {
  return db('data_values')
    .join('indicators', 'indicators.id', 'data_values.indicator_id')
    .select(
      'indicators.id as indicator_id',
      'indicators.name as indicator_name',
      'indicators.code as indicator_code',
      'indicators.data_type',
      'indicators.required',
      'indicators.min_value',
      'indicators.max_value',
      'indicators.precision',
      'indicators.description',
      'indicators.status as indicator_status',
      'data_values.value'
    )
    .where('data_values.submission_id', submissionId)
    .orderBy('indicators.name', 'asc');
}

/**
 * Get all active indicators for a dataset (for building the full report
 * including indicators with no submitted value).
 */
async function getDatasetIndicators(datasetId) {
  return db('indicators')
    .where({ dataset_id: datasetId, status: 'ACTIVE' })
    .select('*')
    .orderBy('name', 'asc');
}

// ─── Monthly Report ───────────────────────────────────────────────────────────

/**
 * Returns all datasets with their approval status for a given period.
 * Only APPROVED submissions are marked as approved.
 */
async function getMonthlyReport(reportingPeriodId) {
  const period = await db('reporting_periods')
    .where('id', reportingPeriodId)
    .first();

  const datasets = await db('datasets')
    .where('datasets.status', 'ACTIVE')
    .select('datasets.*')
    .orderBy('datasets.name', 'asc');

  // Get all approved submissions for this period
  const approvedSubs = await db('submissions')
    .join('users', 'users.id', 'submissions.owner_user_id')
    .select(
      'submissions.dataset_id',
      'submissions.id as submission_id',
      'submissions.status',
      'submissions.submitted_at',
      'submissions.approved_at',
      'users.name as owner_name'
    )
    .where('submissions.reporting_period_id', reportingPeriodId)
    .where('submissions.status', 'APPROVED');

  const subByDataset = {};
  for (const s of approvedSubs) subByDataset[s.dataset_id] = s;

  return { period, datasets, subByDataset };
}

// ─── Indicator Report ─────────────────────────────────────────────────────────

/**
 * Returns the approved value for one indicator in a given period.
 */
async function getIndicatorReport(datasetId, indicatorId, reportingPeriodId) {
  // Validate indicator belongs to dataset
  const indicator = await db('indicators')
    .where({ id: indicatorId, dataset_id: datasetId })
    .first();

  if (!indicator) return { indicator: null, submission: null, value: null };

  // Get approved submission
  const submission = await getApprovedSubmission(datasetId, reportingPeriodId);
  if (!submission) return { indicator, submission: null, value: null };

  // Get the specific value
  const dataValue = await db('data_values')
    .where({ submission_id: submission.id, indicator_id: indicatorId })
    .first();

  return { indicator, submission, value: dataValue ? dataValue.value : null };
}

// ─── Submission Status Report ─────────────────────────────────────────────────

/**
 * Returns submissions filtered by status, dataset, period.
 * All statuses included (not just APPROVED).
 */
async function getSubmissionStatus({ datasetId, reportingPeriodId, status, search, page = 1, perPage = 50 } = {}) {
  let query = db('submissions')
    .join('datasets', 'datasets.id', 'submissions.dataset_id')
    .join('reporting_periods', 'reporting_periods.id', 'submissions.reporting_period_id')
    .join('users', 'users.id', 'submissions.owner_user_id')
    .select(
      'submissions.id',
      'submissions.status',
      'submissions.submitted_at',
      'submissions.reviewed_at',
      'submissions.approved_at',
      'submissions.returned_at',
      'submissions.created_at',
      'datasets.id as dataset_id',
      'datasets.name as dataset_name',
      'datasets.code as dataset_code',
      'reporting_periods.id as period_id',
      'reporting_periods.label as period_label',
      'reporting_periods.period_type',
      'users.name as owner_name',
      'users.email as owner_email'
    )
    .orderBy('submissions.created_at', 'desc');

  if (datasetId) query = query.where('submissions.dataset_id', datasetId);
  if (reportingPeriodId) query = query.where('submissions.reporting_period_id', reportingPeriodId);
  if (status) query = query.where('submissions.status', status);
  if (search) {
    query = query.where(function () {
      this.where('datasets.name', 'like', `%${search}%`)
        .orWhere('datasets.code', 'like', `%${search}%`)
        .orWhere('reporting_periods.label', 'like', `%${search}%`)
        .orWhere('users.name', 'like', `%${search}%`);
    });
  }

  // Pagination
  const offset = (page - 1) * perPage;
  const countQuery = query.clone().clearSelect().clearOrder().count('submissions.id as total').first();
  const [{ total }, rows] = await Promise.all([
    countQuery,
    query.clone().limit(perPage).offset(offset),
  ]);

  return {
    data: rows,
    meta: { page, perPage, total: Number(total), totalPages: Math.ceil(Number(total) / perPage) },
  };
}

// ─── Report History ───────────────────────────────────────────────────────────

async function recordHistory({ userId, reportType, datasetId = null, reportingPeriodId = null, indicatorId = null, parameters = null }) {
  try {
    await db('report_history').insert({
      user_id: userId,
      report_type: reportType,
      dataset_id: datasetId,
      reporting_period_id: reportingPeriodId,
      indicator_id: indicatorId,
      parameters: parameters ? JSON.stringify(parameters) : null,
    });
  } catch (err) {
    // History recording must not block the report response
    console.error('Report history write failed:', err.message);
  }
}

async function getHistory({ userId, page = 1, perPage = 50 } = {}) {
  const offset = (page - 1) * perPage;

  let baseQuery = db('report_history')
    .join('users', 'users.id', 'report_history.user_id')
    .leftJoin('datasets', 'datasets.id', 'report_history.dataset_id')
    .leftJoin('reporting_periods', 'reporting_periods.id', 'report_history.reporting_period_id')
    .leftJoin('indicators', 'indicators.id', 'report_history.indicator_id')
    .select(
      'report_history.id',
      'report_history.report_type',
      'report_history.accessed_at',
      'users.name as user_name',
      'users.email as user_email',
      'datasets.name as dataset_name',
      'datasets.code as dataset_code',
      'reporting_periods.label as period_label',
      'indicators.name as indicator_name',
      'report_history.parameters'
    )
    .orderBy('report_history.accessed_at', 'desc');

  if (userId) baseQuery = baseQuery.where('report_history.user_id', userId);

  const countQuery = db('report_history')
    .count('id as total')
    .modify(q => { if (userId) q.where('user_id', userId); })
    .first();

  const [{ total }, rows] = await Promise.all([
    countQuery,
    baseQuery.clone().limit(perPage).offset(offset),
  ]);

  return {
    data: rows,
    meta: { page, perPage, total: Number(total), totalPages: Math.ceil(Number(total) / perPage) },
  };
}

module.exports = {
  getApprovedSubmission,
  getSubmissionValues,
  getDatasetIndicators,
  getMonthlyReport,
  getIndicatorReport,
  getSubmissionStatus,
  recordHistory,
  getHistory,
};
