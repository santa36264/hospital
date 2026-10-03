/**
 * Stage 09 — Custom Report Service
 *
 * Builds the normalised report-data structure used by:
 *   - preview endpoint
 *   - PDF export
 *   - Excel export
 *
 * One shared buildReportData() function guarantees Preview = PDF = Excel.
 */

const ApiError = require('../errors/ApiError');
const customReportRepository = require('../repositories/customReportRepository');
const reportRepository = require('../repositories/reportRepository');   // for history
const { formatIndicatorValue } = require('./export/valueFormatter');

const { MAX_INDICATORS, MAX_PERIODS } = customReportRepository;

// ─── Validation ───────────────────────────────────────────────────────────────

function validateInput(datasetId, indicatorIds, periodIds) {
  const errors = {};

  if (!datasetId) errors.dataset_id = 'Dataset is required.';
  if (!Array.isArray(indicatorIds) || indicatorIds.length === 0)
    errors.indicator_ids = 'At least one indicator must be selected.';
  if (!Array.isArray(periodIds) || periodIds.length === 0)
    errors.reporting_period_ids = 'At least one reporting period must be selected.';

  if (Array.isArray(indicatorIds) && indicatorIds.length > MAX_INDICATORS)
    errors.indicator_ids = `Maximum ${MAX_INDICATORS} indicators allowed.`;
  if (Array.isArray(periodIds) && periodIds.length > MAX_PERIODS)
    errors.reporting_period_ids = `Maximum ${MAX_PERIODS} periods allowed.`;

  if (Object.keys(errors).length) throw new ApiError(422, 'Validation failed.', errors);
}

// ─── Core report-data builder (shared by preview, PDF, Excel) ─────────────────

/**
 * Returns a normalised report object:
 * {
 *   dataset,
 *   indicators:  [ { id, name, code, data_type, ... } ],
 *   periods:     [ { id, label, period_type, start_date, ... } ],   // chronological
 *   matrix:      { [indicatorId]: { [periodId]: formattedValue | null } },
 *   generatedAt: ISO string
 * }
 */
async function buildReportData(datasetId, indicatorIds, periodIds) {
  validateInput(datasetId, indicatorIds, periodIds);

  const { dataset, indicators, periods } =
    await customReportRepository.loadSelections(datasetId, indicatorIds, periodIds);

  if (!dataset) throw new ApiError(404, 'Dataset not found.');

  // Verify every requested indicator was found and belongs to this dataset
  if (indicators.length !== indicatorIds.length) {
    const foundIds = new Set(indicators.map(i => i.id));
    const missing = indicatorIds.filter(id => !foundIds.has(id));
    throw new ApiError(422, 'Validation failed.', {
      indicator_ids: `Indicator(s) not found or do not belong to dataset: ${missing.join(', ')}.`,
    });
  }

  // Verify every requested period was found
  if (periods.length !== periodIds.length) {
    const foundIds = new Set(periods.map(p => p.id));
    const missing = periodIds.filter(id => !foundIds.has(id));
    throw new ApiError(422, 'Validation failed.', {
      reporting_period_ids: `Reporting period(s) not found: ${missing.join(', ')}.`,
    });
  }

  // Single bulk query — no N+1
  const rawValues = await customReportRepository.fetchMatrixValues(
    datasetId,
    indicatorIds,
    periodIds
  );

  // Build lookup: { indicatorId: { periodId: rawValue } }
  const lookup = {};
  for (const { indicator_id, period_id, value } of rawValues) {
    if (!lookup[indicator_id]) lookup[indicator_id] = {};
    lookup[indicator_id][period_id] = value;
  }

  // Build matrix: indicator × period → formatted value (null = no approved data)
  const matrix = {};
  for (const ind of indicators) {
    matrix[ind.id] = {};
    for (const period of periods) {
      const raw = lookup[ind.id]?.[period.id];
      matrix[ind.id][period.id] =
        raw !== undefined && raw !== null && String(raw).trim() !== ''
          ? formatIndicatorValue(raw, ind.data_type, ind.precision)
          : null;
    }
  }

  return {
    dataset,
    indicators,
    periods,   // already chronological from loadSelections (ORDER BY start_date)
    matrix,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Preview ──────────────────────────────────────────────────────────────────

async function previewCustomReport({ datasetId, indicatorIds, periodIds }, user) {
  const reportData = await buildReportData(datasetId, indicatorIds, periodIds);

  // Record history (fire-and-forget)
  reportRepository.recordHistory({
    userId: user.id,
    reportType: 'CUSTOM_REPORT',
    datasetId,
    parameters: {
      indicator_ids: indicatorIds,
      period_ids: periodIds,
      indicatorCount: indicatorIds.length,
      periodCount: periodIds.length,
    },
  });

  return reportData;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = { buildReportData, previewCustomReport };
