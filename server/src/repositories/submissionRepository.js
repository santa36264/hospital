const { db } = require('../config/database');

// ─── Submissions ─────────────────────────────────────────────────────────────

async function findById(id) {
  return db('submissions')
    .join('datasets', 'datasets.id', 'submissions.dataset_id')
    .join('reporting_periods', 'reporting_periods.id', 'submissions.reporting_period_id')
    .select(
      'submissions.*',
      'datasets.name as dataset_name',
      'datasets.code as dataset_code',
      'datasets.status as dataset_status',
      'reporting_periods.label as period_label',
      'reporting_periods.status as period_status',
      'reporting_periods.period_type',
      'reporting_periods.start_date',
      'reporting_periods.end_date'
    )
    .where('submissions.id', id)
    .first();
}

async function findByOwner(ownerId, { status, datasetId, reportingPeriodId } = {}) {
  let query = db('submissions')
    .join('datasets', 'datasets.id', 'submissions.dataset_id')
    .join('reporting_periods', 'reporting_periods.id', 'submissions.reporting_period_id')
    .select(
      'submissions.*',
      'datasets.name as dataset_name',
      'datasets.code as dataset_code',
      'reporting_periods.label as period_label',
      'reporting_periods.status as period_status',
      'reporting_periods.period_type'
    )
    .where('submissions.owner_user_id', ownerId)
    .orderBy('submissions.updated_at', 'desc');

  if (status) query = query.where('submissions.status', status);
  if (datasetId) query = query.where('submissions.dataset_id', datasetId);
  if (reportingPeriodId) query = query.where('submissions.reporting_period_id', reportingPeriodId);

  return query;
}

async function findByDatasetAndPeriod(datasetId, reportingPeriodId) {
  return db('submissions')
    .where({ dataset_id: datasetId, reporting_period_id: reportingPeriodId })
    .first();
}

async function create(trx, data) {
  const conn = trx || db;
  const [id] = await conn('submissions').insert(data);
  // Use the same connection (trx) so the row is visible before commit.
  return conn('submissions')
    .join('datasets', 'datasets.id', 'submissions.dataset_id')
    .join('reporting_periods', 'reporting_periods.id', 'submissions.reporting_period_id')
    .select(
      'submissions.*',
      'datasets.name as dataset_name',
      'datasets.code as dataset_code',
      'datasets.status as dataset_status',
      'reporting_periods.label as period_label',
      'reporting_periods.status as period_status',
      'reporting_periods.period_type',
      'reporting_periods.start_date',
      'reporting_periods.end_date'
    )
    .where('submissions.id', id)
    .first();
}

async function update(trx, id, data) {
  const conn = trx || db;
  await conn('submissions').where({ id }).update({
    ...data,
    updated_at: db.fn.now(),
  });
  // Read back on the same connection so changes are visible within the transaction.
  return conn('submissions')
    .join('datasets', 'datasets.id', 'submissions.dataset_id')
    .join('reporting_periods', 'reporting_periods.id', 'submissions.reporting_period_id')
    .select(
      'submissions.*',
      'datasets.name as dataset_name',
      'datasets.code as dataset_code',
      'datasets.status as dataset_status',
      'reporting_periods.label as period_label',
      'reporting_periods.status as period_status',
      'reporting_periods.period_type',
      'reporting_periods.start_date',
      'reporting_periods.end_date'
    )
    .where('submissions.id', id)
    .first();
}

// ─── Data Values ──────────────────────────────────────────────────────────────

async function getDataValues(submissionId) {
  return db('data_values')
    .where({ submission_id: submissionId })
    .select('*');
}

/**
 * Upsert a single indicator value for a submission.
 * MySQL ON DUPLICATE KEY UPDATE used via knex raw.
 */
async function upsertDataValue(trx, submissionId, indicatorId, value) {
  const conn = trx || db;
  const existing = await conn('data_values')
    .where({ submission_id: submissionId, indicator_id: indicatorId })
    .first();

  if (existing) {
    await conn('data_values')
      .where({ submission_id: submissionId, indicator_id: indicatorId })
      .update({ value, updated_at: db.fn.now() });
  } else {
    await conn('data_values').insert({
      submission_id: submissionId,
      indicator_id: indicatorId,
      value,
    });
  }
}

/**
 * Bulk-upsert data values for a submission.
 * values: Array<{ indicator_id, value }>
 */
async function upsertDataValues(trx, submissionId, values) {
  for (const v of values) {
    await upsertDataValue(trx, submissionId, v.indicator_id, v.value);
  }
}

// ─── Submission History ───────────────────────────────────────────────────────

async function addHistory(trx, submissionId, userId, action, reason = null) {
  await (trx || db)('submission_history').insert({
    submission_id: submissionId,
    user_id: userId,
    action,
    reason,
  });
}

async function getHistory(submissionId) {
  return db('submission_history')
    .join('users', 'users.id', 'submission_history.user_id')
    .select(
      'submission_history.*',
      'users.name as user_name',
      'users.email as user_email'
    )
    .where('submission_history.submission_id', submissionId)
    .orderBy('submission_history.created_at', 'asc');
}

module.exports = {
  findById,
  findByOwner,
  findByDatasetAndPeriod,
  create,
  update,
  getDataValues,
  upsertDataValue,
  upsertDataValues,
  addHistory,
  getHistory,
};

// ─── Review queue (Reporting) ─────────────────────────────────────────────────

/**
 * List submissions available for Reporting review.
 * Returns SUBMITTED and UNDER_REVIEW submissions with joins.
 */
async function findForReview({ status, datasetId, reportingPeriodId, search } = {}) {
  let query = db('submissions')
    .join('datasets', 'datasets.id', 'submissions.dataset_id')
    .join('reporting_periods', 'reporting_periods.id', 'submissions.reporting_period_id')
    .join('users', 'users.id', 'submissions.owner_user_id')
    .select(
      'submissions.*',
      'datasets.name as dataset_name',
      'datasets.code as dataset_code',
      'reporting_periods.label as period_label',
      'reporting_periods.status as period_status',
      'reporting_periods.period_type',
      'users.name as owner_name',
      'users.email as owner_email'
    )
    .whereIn('submissions.status', status ? [status] : ['SUBMITTED', 'UNDER_REVIEW'])
    .orderBy('submissions.submitted_at', 'asc');

  if (datasetId) query = query.where('submissions.dataset_id', datasetId);
  if (reportingPeriodId) query = query.where('submissions.reporting_period_id', reportingPeriodId);
  if (search) {
    query = query.where(function () {
      this.where('datasets.name', 'like', `%${search}%`)
        .orWhere('datasets.code', 'like', `%${search}%`)
        .orWhere('reporting_periods.label', 'like', `%${search}%`)
        .orWhere('users.name', 'like', `%${search}%`);
    });
  }

  return query;
}

/**
 * Get a single submission with owner info (for Reporting detail view).
 */
async function findByIdWithOwner(id) {
  return db('submissions')
    .join('datasets', 'datasets.id', 'submissions.dataset_id')
    .join('reporting_periods', 'reporting_periods.id', 'submissions.reporting_period_id')
    .join('users', 'users.id', 'submissions.owner_user_id')
    .select(
      'submissions.*',
      'datasets.name as dataset_name',
      'datasets.code as dataset_code',
      'datasets.status as dataset_status',
      'reporting_periods.label as period_label',
      'reporting_periods.status as period_status',
      'reporting_periods.period_type',
      'reporting_periods.start_date',
      'reporting_periods.end_date',
      'users.name as owner_name',
      'users.email as owner_email'
    )
    .where('submissions.id', id)
    .first();
}

// Re-export new functions
Object.assign(module.exports, { findForReview, findByIdWithOwner });
