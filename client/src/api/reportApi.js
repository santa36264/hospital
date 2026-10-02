import apiClient from './client';

/** Dataset report — approved indicator values for one dataset + period. */
export async function getDatasetReport({ datasetId, reportingPeriodId }) {
  const res = await apiClient.get('/reports/dataset', {
    params: { dataset_id: datasetId, reporting_period_id: reportingPeriodId },
  });
  return res.data;
}

/** Monthly report — all active datasets with approval status for one period. */
export async function getMonthlyReport({ reportingPeriodId }) {
  const res = await apiClient.get('/reports/monthly', {
    params: { reporting_period_id: reportingPeriodId },
  });
  return res.data;
}

/** Indicator report — approved value for one indicator/dataset/period. */
export async function getIndicatorReport({ datasetId, indicatorId, reportingPeriodId }) {
  const res = await apiClient.get('/reports/indicator', {
    params: {
      dataset_id: datasetId,
      indicator_id: indicatorId,
      reporting_period_id: reportingPeriodId,
    },
  });
  return res.data;
}

/** Submission status report — workflow overview across all statuses. */
export async function getSubmissionStatusReport({ datasetId, reportingPeriodId, status, search, page, perPage } = {}) {
  const params = {};
  if (datasetId) params.dataset_id = datasetId;
  if (reportingPeriodId) params.reporting_period_id = reportingPeriodId;
  if (status) params.status = status;
  if (search) params.search = search;
  if (page) params.page = page;
  if (perPage) params.per_page = perPage;
  const res = await apiClient.get('/reports/submission-status', { params });
  return res.data;
}

/** Report history — access log for the authenticated user. */
export async function getReportHistory({ page, perPage } = {}) {
  const params = {};
  if (page) params.page = page;
  if (perPage) params.per_page = perPage;
  const res = await apiClient.get('/reports/history', { params });
  return res.data;
}
