import apiClient from './client';

export async function getDatasets(params = {}) {
  const res = await apiClient.get('/datasets', { params });
  return res.data;
}

export async function getDataset(id) {
  const res = await apiClient.get(`/datasets/${id}`);
  return res.data;
}

export async function createDataset(payload) {
  const res = await apiClient.post('/datasets', payload);
  return res.data;
}

export async function updateDataset(id, payload) {
  const res = await apiClient.patch(`/datasets/${id}`, payload);
  return res.data;
}

export async function setDatasetStatus(id, status) {
  const res = await apiClient.patch(`/datasets/${id}/status`, { status });
  return res.data;
}
