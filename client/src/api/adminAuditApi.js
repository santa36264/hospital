import apiClient from './client';

export async function getAuditLogs(params = {}) {
  const res = await apiClient.get('/admin/audit-logs', { params });
  return res.data;
}
