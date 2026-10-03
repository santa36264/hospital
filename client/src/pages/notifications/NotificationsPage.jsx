import { useEffect, useState } from 'react';
import {
  getNotifications, markNotificationRead, markAllNotificationsRead,
} from '../../api/notificationApi';
import {
  PageHeader, Card, CardBody, Button, Notice, LoadingState, EmptyState, Tabs,
} from '../../components/reports';
import {
  Bell, CheckCircle, RotateCcw, Eye, Info,
} from 'lucide-react';

function formatDate(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  const now = new Date();
  const diffMs = now - d;
  const diffMin  = Math.floor(diffMs / 60000);
  const diffHr   = Math.floor(diffMs / 3600000);
  const diffDay  = Math.floor(diffMs / 86400000);

  if (diffMin < 1)   return 'Just now';
  if (diffMin < 60)  return `${diffMin}m ago`;
  if (diffHr < 24)   return `${diffHr}h ago`;
  if (diffDay < 7)   return `${diffDay}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

const TYPE_META = {
  SUBMISSION_APPROVED: {
    icon:    CheckCircle,
    color:   'text-green-600',
    bg:      'bg-green-50',
    label:   'Submission Approved',
  },
  SUBMISSION_RETURNED: {
    icon:    RotateCcw,
    color:   'text-red-600',
    bg:      'bg-red-50',
    label:   'Returned for Correction',
  },
  SUBMISSION_UNDER_REVIEW: {
    icon:    Eye,
    color:   'text-purple-600',
    bg:      'bg-purple-50',
    label:   'Under Review',
  },
  SUBMISSION_SUBMITTED: {
    icon:    Info,
    color:   'text-blue-600',
    bg:      'bg-blue-50',
    label:   'New Submission',
  },
};

function getTypeMeta(type) {
  return TYPE_META[type] || {
    icon:  Bell,
    color: 'text-slate-500',
    bg:    'bg-slate-100',
    label: 'Notification',
  };
}

function NotificationItem({ notification: n, onMarkRead }) {
  const meta = getTypeMeta(n.type);
  const Icon = meta.icon;
  const isUnread = n.status === 'UNREAD';

  return (
    <div className={`flex items-start gap-4 px-6 py-4 border-b border-slate-100 last:border-0 transition-colors ${isUnread ? 'bg-blue-50/40' : ''}`}>
      {/* Type icon */}
      <div className={`w-8 h-8 rounded-full ${meta.bg} flex items-center justify-center shrink-0 mt-0.5`}>
        <Icon className={`w-4 h-4 ${meta.color}`} aria-hidden />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${meta.color}`}>
              {meta.label}
            </p>
            <p className={`text-sm leading-snug ${isUnread ? 'text-slate-800 font-medium' : 'text-slate-600'}`}>
              {n.message}
            </p>
          </div>
          {/* Unread dot */}
          {isUnread && (
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" aria-label="Unread" />
          )}
        </div>
        <div className="flex items-center justify-between mt-2 gap-2">
          <time className="text-xs text-slate-400">{formatDate(n.created_at)}</time>
          {isUnread && (
            <button
              onClick={() => onMarkRead(n.id)}
              className="text-xs text-blue-600 hover:underline font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Mark as read
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all'); // 'all' | 'unread'

  async function load(unreadOnly = false) {
    setLoading(true);
    setError('');
    try {
      const res = await getNotifications({ unread: unreadOnly ? 'true' : undefined });
      setNotifications(res.data || []);
    } catch {
      setError('Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(tab === 'unread'); }, [tab]); // eslint-disable-line

  async function handleMarkRead(id) {
    await markNotificationRead(id).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, status: 'READ' } : n));
  }

  async function handleMarkAll() {
    await markAllNotificationsRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, status: 'READ' })));
  }

  const unreadCount = notifications.filter(n => n.status === 'UNREAD').length;
  const displayed   = tab === 'unread' ? notifications.filter(n => n.status === 'UNREAD') : notifications;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up.'}
        action={
          unreadCount > 0 ? (
            <Button variant="secondary" size="sm" onClick={handleMarkAll}>
              Mark all read
            </Button>
          ) : undefined
        }
      />

      {error && <Notice variant="danger" onDismiss={() => setError('')} className="mb-4">{error}</Notice>}

      <Tabs
        tabs={[
          { id: 'all',    label: 'All',    count: notifications.length },
          { id: 'unread', label: 'Unread', count: unreadCount },
        ]}
        active={tab}
        onChange={setTab}
      />

      {loading ? (
        <LoadingState message="Loading notifications…" />
      ) : displayed.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={tab === 'unread' ? 'No unread notifications' : 'No notifications'}
          message={
            tab === 'unread'
              ? 'All notifications have been read.'
              : 'Submission reviews, returns, approvals, and system events will appear here.'
          }
        />
      ) : (
        <Card>
          <div>
            {displayed.map(n => (
              <NotificationItem key={n.id} notification={n} onMarkRead={handleMarkRead} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
