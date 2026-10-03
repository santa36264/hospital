import apiClient from './client';

export async function getUsers(params = {}) {
  const res = await apiClient.get('/admin/users', { params });
  return res.data;
}

export async function getUser(id) {
  const res = await apiClient.get(`/admin/users/${id}`);
  return res.data;
}

export async function createUser(payload) {
  const res = await apiClient.post('/admin/users', payload);
  return res.data;
}

export async function updateUser(id, payload) {
  const res = await apiClient.patch(`/admin/users/${id}`, payload);
  return res.data;
}

export async function changeUserPassword(id, password) {
  const res = await apiClient.post(`/admin/users/${id}/password`, { password });
  return res.data;
}

export async function activateUser(id) {
  const res = await apiClient.post(`/admin/users/${id}/activate`);
  return res.data;
}

export async function deactivateUser(id) {
  const res = await apiClient.post(`/admin/users/${id}/deactivate`);
  return res.data;
}
