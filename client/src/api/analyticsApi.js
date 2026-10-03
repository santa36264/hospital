import apiClient from './client';

/** Dashboard summary — coverage, dataset status, key indicators. */
export async function getDashboard({ reportingPeriodId, datasetId } = {}) {
  const params = {};
  if (reportingPeriodId) params.reporting_period_id = reportingPeriodId;
  if (datasetId) params.dataset_id = datasetId;
  const res = await apiClient.get('/analytics/dashboard', { params });
  return res.data;
}

/** Indicator trend over a period range. */
export async function getIndicatorTrend({ datasetId, indicatorId, startPeriodId, endPeriodId }) {
  const res = await apiClient.get('/analytics/indicator-trend', {
    params: {
      dataset_id: datasetId,
      indicator_id: indicatorId,
      start_period_id: startPeriodId,
      end_period_id: endPeriodId,
    },
  });
  return res.data;
}

/** Indicator comparison between two specific periods. */
export async function getIndicatorComparison({ datasetId, indicatorId, periodAId, periodBId }) {
  const res = await apiClient.get('/analytics/indicator-comparison', {
    params: {
      dataset_id: datasetId,
      indicator_id: indicatorId,
      period_a: periodAId,
      period_b: periodBId,
    },
  });
  return res.data;
}
