import apiClient from './client';

export async function getSystemOverview() {
  const res = await apiClient.get('/admin/system/overview');
  return res.data;
}
