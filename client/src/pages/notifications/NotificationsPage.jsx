import { useEffect, useState } from 'react';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../api/notificationApi';

function formatDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function typeIcon(type) {
  if (type === 'SUBMISSION_APPROVED') return '✓';
  if (type === 'SUBMISSION_RETURNED') return '!';
  if (type === 'SUBMISSION_UNDER_REVIEW') return '◎';
  return '•';
}

function typeColour(type) {
  if (type === 'SUBMISSION_APPROVED') return 'bg-green-100 text-green-700';
  if (type === 'SUBMISSION_RETURNED') return 'bg-red-100 text-red-700';
  if (type === 'SUBMISSION_UNDER_REVIEW') return 'bg-purple-100 text-purple-700';
  return 'bg-blue-100 text-blue-700';
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getNotifications({ unread: unreadOnly ? 'true' : undefined });
      setNotifications(res.data || []);
    } catch {
      setError('Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [unreadOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleMarkRead(id) {
    await markNotificationRead(id).catch(() => {});
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, status: 'READ' } : n)
    );
  }

  async function handleMarkAll() {
    await markAllNotificationsRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, status: 'READ' })));
  }

  const unreadCount = notifications.filter(n => n.status === 'UNREAD').length;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Notifications</h2>
          {unreadCount > 0 && (
            <p className="text-slate-500 text-sm mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={e => setUnreadOnly(e.target.checked)}
              className="rounded border-slate-300"
            />
            Unread only
          </label>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              className="text-sm text-blue-600 hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-slate-500">Loading…</div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-10 text-center">
            <p className="text-3xl mb-3">🔔</p>
            <p className="text-slate-600 font-medium">No notifications</p>
            <p className="text-slate-400 text-sm mt-1">
              {unreadOnly ? 'No unread notifications.' : 'You have no notifications yet.'}
            </p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`bg-white rounded-lg shadow px-4 py-3 flex items-start gap-3 transition-opacity ${
                n.status === 'READ' ? 'opacity-60' : ''
              }`}
            >
              <span className={`mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold shrink-0 ${typeColour(n.type)}`}>
                {typeIcon(n.type)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-800 leading-snug">{n.message}</p>
                <p className="text-xs text-slate-400 mt-1">{formatDate(n.created_at)}</p>
              </div>
              {n.status === 'UNREAD' && (
                <button
                  onClick={() => handleMarkRead(n.id)}
                  className="text-xs text-blue-600 hover:underline shrink-0 mt-1"
                >
                  Mark read
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
