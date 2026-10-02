import apiClient from './client';

export async function getIndicators(params = {}) {
  const res = await apiClient.get('/indicators', { params });
  return res.data;
}

export async function getIndicator(id) {
  const res = await apiClient.get(`/indicators/${id}`);
  return res.data;
}

export async function createIndicator(payload) {
  const res = await apiClient.post('/indicators', payload);
  return res.data;
}

export async function updateIndicator(id, payload) {
  const res = await apiClient.patch(`/indicators/${id}`, payload);
  return res.data;
}

export async function setIndicatorStatus(id, status) {
  const res = await apiClient.patch(`/indicators/${id}/status`, { status });
  return res.data;
}
