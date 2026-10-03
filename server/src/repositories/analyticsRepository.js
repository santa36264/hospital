/**
 * Stage 10 — Analytics Repository
 * All queries are READ-ONLY. APPROVED submissions only for finalized data.
 */
const { db } = require('../config/database');

// ─── Dashboard ────────────────────────────────────────────────────────────────

/**
 * Reporting coverage for a given period:
 * Returns { totalActive, approved, notApproved, coverage }
 * coverage = approved / totalActive * 100 (null if no active datasets)
 */
async function getCoverageForPeriod(reportingPeriodId, datasetId = null) {
  let dsQuery = db('datasets').where('status', 'ACTIVE');
  if (datasetId) dsQuery = dsQuery.where('id', datasetId);
  const activeDatasets = await dsQuery.select('id', 'name', 'code');

  if (activeDatasets.length === 0) {
    return { totalActive: 0, approved: 0, notApproved: 0, coverage: null };
  }

  const dsIds = activeDatasets.map(d => d.id);

  const approvedSubs = await db('submissions')
    .whereIn('dataset_id', dsIds)
    .where('reporting_period_id', reportingPeriodId)
    .where('status', 'APPROVED')
    .select('dataset_id', 'approved_at');

  const approvedSet = new Set(approvedSubs.map(s => s.dataset_id));
  const approved = approvedSet.size;
  const total = activeDatasets.length;

  return {
    totalActive: total,
    approved,
    notApproved: total - approved,
    coverage: Math.round((approved / total) * 100),
  };
}

/**
 * Dataset status table for a period: each active dataset with its
 * approval state and approved_at date.
 */
async function getDatasetStatusForPeriod(reportingPeriodId, datasetId = null) {
  let dsQuery = db('datasets').where('status', 'ACTIVE').orderBy('name', 'asc');
  if (datasetId) dsQuery = dsQuery.where('id', datasetId);
  const datasets = await dsQuery.select('id', 'name', 'code');

  if (datasets.length === 0) return [];

  const dsIds = datasets.map(d => d.id);

  const approvedSubs = await db('submissions')
    .join('users', 'users.id', 'submissions.owner_user_id')
    .whereIn('submissions.dataset_id', dsIds)
    .where('submissions.reporting_period_id', reportingPeriodId)
    .where('submissions.status', 'APPROVED')
    .select(
      'submissions.dataset_id',
      'submissions.id as submission_id',
      'submissions.approved_at',
      'users.name as owner_name'
    );

  const subMap = {};
  for (const s of approvedSubs) subMap[s.dataset_id] = s;

  return datasets.map(ds => ({
    dataset_id: ds.id,
    dataset_name: ds.name,
    dataset_code: ds.code,
    approved: !!subMap[ds.id],
    submission_id: subMap[ds.id]?.submission_id ?? null,
    approved_at: subMap[ds.id]?.approved_at ?? null,
    owner_name: subMap[ds.id]?.owner_name ?? null,
  }));
}

/**
 * Key approved indicator values for a period.
 * Returns up to `limit` indicator values from approved submissions.
 * Each row: indicator_name, code, data_type, value, dataset_name, period_label.
 */
async function getKeyIndicators(reportingPeriodId, datasetId = null, limit = 20) {
  let query = db('data_values')
    .join('submissions', 'submissions.id', 'data_values.submission_id')
    .join('indicators', 'indicators.id', 'data_values.indicator_id')
    .join('datasets', 'datasets.id', 'submissions.dataset_id')
    .join('reporting_periods', 'reporting_periods.id', 'submissions.reporting_period_id')
    .where('submissions.reporting_period_id', reportingPeriodId)
    .where('submissions.status', 'APPROVED')
    .where('indicators.status', 'ACTIVE')
    .whereNotNull('data_values.value')
    .where('data_values.value', '!=', '')
    .select(
      'indicators.id as indicator_id',
      'indicators.name as indicator_name',
      'indicators.code as indicator_code',
      'indicators.data_type',
      'data_values.value',
      'datasets.name as dataset_name',
      'datasets.code as dataset_code',
      'reporting_periods.label as period_label'
    )
    .orderBy('datasets.name', 'asc')
    .orderBy('indicators.name', 'asc')
    .limit(limit);

  if (datasetId) query = query.where('submissions.dataset_id', datasetId);

  return query;
}

/**
 * Latest available reporting period (most recent start_date).
 */
async function getLatestPeriod() {
  return db('reporting_periods')
    .orderBy('start_date', 'desc')
    .first();
}

// ─── Indicator Trend ──────────────────────────────────────────────────────────

/**
 * Returns approved values for one indicator across multiple periods.
 * Periods ordered chronologically (start_date ASC).
 * If no approved submission exists for a period, value = null.
 */
async function getIndicatorTrend(datasetId, indicatorId, startPeriodId, endPeriodId) {
  // 1. Get the indicator (verifying it belongs to the dataset).
  const indicator = await db('indicators')
    .where({ id: indicatorId, dataset_id: datasetId })
    .first();
  if (!indicator) return { indicator: null, periods: [], values: [] };

  // 2. Get all periods between start and end (inclusive), ordered chronologically.
  const startPeriod = await db('reporting_periods').where('id', startPeriodId).first();
  const endPeriod   = await db('reporting_periods').where('id', endPeriodId).first();
  if (!startPeriod || !endPeriod) return { indicator, periods: [], values: [] };

  const periods = await db('reporting_periods')
    .where('start_date', '>=', startPeriod.start_date)
    .where('start_date', '<=', endPeriod.start_date)
    .orderBy('start_date', 'asc')
    .select('id', 'label', 'start_date', 'end_date', 'period_type');

  if (periods.length === 0) return { indicator, periods: [], values: [] };

  // 3. Bulk-fetch approved values for all those periods (no N+1).
  const periodIds = periods.map(p => p.id);
  const rows = await db('data_values')
    .join('submissions', 'submissions.id', 'data_values.submission_id')
    .where('submissions.dataset_id', datasetId)
    .whereIn('submissions.reporting_period_id', periodIds)
    .where('submissions.status', 'APPROVED')
    .where('data_values.indicator_id', indicatorId)
    .select('submissions.reporting_period_id as period_id', 'data_values.value');

  const valueByPeriod = {};
  for (const r of rows) valueByPeriod[r.period_id] = r.value;

  // 4. Build result: null where no approved data exists.
  const values = periods.map(p => ({
    period_id: p.id,
    period_label: p.label,
    start_date: p.start_date,
    value: valueByPeriod[p.id] !== undefined ? valueByPeriod[p.id] : null,
  }));

  return { indicator, periods, values };
}

// ─── Indicator Comparison ─────────────────────────────────────────────────────

/**
 * Compare one indicator between two periods.
 * Returns values for period A and period B plus calculated difference.
 */
async function getIndicatorComparison(datasetId, indicatorId, periodAId, periodBId) {
  const indicator = await db('indicators')
    .where({ id: indicatorId, dataset_id: datasetId })
    .first();
  if (!indicator) return null;

  const [periodA, periodB] = await Promise.all([
    db('reporting_periods').where('id', periodAId).first(),
    db('reporting_periods').where('id', periodBId).first(),
  ]);
  if (!periodA || !periodB) return null;

  // Fetch both values in one bulk query
  const rows = await db('data_values')
    .join('submissions', 'submissions.id', 'data_values.submission_id')
    .where('submissions.dataset_id', datasetId)
    .whereIn('submissions.reporting_period_id', [periodAId, periodBId])
    .where('submissions.status', 'APPROVED')
    .where('data_values.indicator_id', indicatorId)
    .select('submissions.reporting_period_id as period_id', 'data_values.value');

  const valueMap = {};
  for (const r of rows) valueMap[r.period_id] = r.value;

  const rawA = valueMap[periodAId] !== undefined ? valueMap[periodAId] : null;
  const rawB = valueMap[periodBId] !== undefined ? valueMap[periodBId] : null;

  // Server-side difference calculation
  let difference = null;
  let differenceLabel = null;
  const isNumeric = ['numeric', 'decimal', 'percentage'].includes(indicator.data_type);

  if (isNumeric && rawA !== null && rawB !== null) {
    const numA = Number(rawA);
    const numB = Number(rawB);
    if (!isNaN(numA) && !isNaN(numB)) {
      const diff = numB - numA;
      difference = diff;
      if (indicator.data_type === 'percentage') {
        // Percentage-point difference, NOT percentage growth
        differenceLabel = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} pp`;
      } else {
        differenceLabel = `${diff >= 0 ? '+' : ''}${diff % 1 === 0 ? diff : diff.toFixed(2)}`;
      }
    }
  }

  return {
    indicator,
    periodA: { ...periodA, value: rawA },
    periodB: { ...periodB, value: rawB },
    difference,
    differenceLabel,
    isNumericComparison: isNumeric,
  };
}

module.exports = {
  getCoverageForPeriod,
  getDatasetStatusForPeriod,
  getKeyIndicators,
  getLatestPeriod,
  getIndicatorTrend,
  getIndicatorComparison,
};
