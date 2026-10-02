import apiClient from './client';

/** List notifications for the authenticated user. */
export async function getNotifications(params = {}) {
  const res = await apiClient.get('/notifications', { params });
  return res.data;
}

/** Get unread count (for the notification bell badge). */
export async function getUnreadCount() {
  const res = await apiClient.get('/notifications/unread-count');
  return res.data;
}

/** Mark a single notification as read. */
export async function markNotificationRead(id) {
  const res = await apiClient.patch(`/notifications/${id}/read`);
  return res.data;
}

/** Mark all notifications as read. */
export async function markAllNotificationsRead() {
  const res = await apiClient.patch('/notifications/read-all');
  return res.data;
}
