/**
 * Stage 09 — Custom Report Repository
 *
 * Provides efficient bulk queries for the indicator-by-period matrix.
 * One query fetches ALL cells; no N+1 per cell.
 */
const { db } = require('../config/database');

const MAX_INDICATORS = 50;
const MAX_PERIODS = 60;

// ─── Validation helpers ───────────────────────────────────────────────────────

/**
 * Validate and return the dataset, confirmed indicators (all belonging to
 * datasetId), and confirmed periods — all in parallel.
 * Throws nothing; returns raw rows for the service to validate.
 */
async function loadSelections(datasetId, indicatorIds, periodIds) {
  const [dataset, indicators, periods] = await Promise.all([
    db('datasets').where({ id: datasetId }).first(),
    db('indicators')
      .whereIn('id', indicatorIds)
      .where('dataset_id', datasetId)  // security: only this dataset's indicators
      .select('*')
      .orderBy('name', 'asc'),
    db('reporting_periods')
      .whereIn('id', periodIds)
      .select('*')
      .orderBy('start_date', 'asc'),   // chronological ordering
  ]);
  return { dataset, indicators, periods };
}

// ─── Matrix data fetch ────────────────────────────────────────────────────────

/**
 * Fetch all approved values for the requested indicators × periods
 * in ONE efficient query (no N+1).
 *
 * Returns: Array of { indicator_id, period_id, value }
 * Only rows with APPROVED submissions are included.
 */
async function fetchMatrixValues(datasetId, indicatorIds, periodIds) {
  return db('data_values')
    .join('submissions', 'submissions.id', 'data_values.submission_id')
    .whereIn('data_values.indicator_id', indicatorIds)
    .whereIn('submissions.reporting_period_id', periodIds)
    .where('submissions.dataset_id', datasetId)
    .where('submissions.status', 'APPROVED')
    .select(
      'data_values.indicator_id',
      'submissions.reporting_period_id as period_id',
      'data_values.value'
    );
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  loadSelections,
  fetchMatrixValues,
  MAX_INDICATORS,
  MAX_PERIODS,
};
