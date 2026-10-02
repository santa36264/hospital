import apiClient from './client';

export async function getReportingPeriods(params = {}) {
  const res = await apiClient.get('/reporting-periods', { params });
  return res.data;
}

export async function getReportingPeriod(id) {
  const res = await apiClient.get(`/reporting-periods/${id}`);
  return res.data;
}

export async function createReportingPeriod(payload) {
  const res = await apiClient.post('/reporting-periods', payload);
  return res.data;
}

export async function updateReportingPeriod(id, payload) {
  const res = await apiClient.patch(`/reporting-periods/${id}`, payload);
  return res.data;
}

export async function setReportingPeriodStatus(id, status) {
  const res = await apiClient.patch(`/reporting-periods/${id}/status`, { status });
  return res.data;
}
