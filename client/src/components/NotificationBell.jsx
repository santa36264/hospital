import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { getUnreadCount } from '../api/notificationApi';

/**
 * Notification bell — header icon-only control.
 * - Professional Lucide Bell icon (no emoji)
 * - Unread badge when count > 0
 * - aria-label with count for screen readers
 * - Tooltip via title attribute
 * - Polls every 60 s
 */
export default function NotificationBell() {
  const [count, setCount] = useState(0);

  async function refresh() {
    try {
      const res = await getUnreadCount();
      setCount(res.data?.count ?? 0);
    } catch {
      // silently degrade
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Link
      to="/app/notifications"
      className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
      aria-label={count > 0 ? `Notifications — ${count} unread` : 'Notifications'}
      title="Notifications"
    >
      <Bell className="w-5 h-5" aria-hidden />

      {/* Unread badge */}
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-0.5 leading-none"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
