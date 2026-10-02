import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUnreadCount } from '../api/notificationApi';

/**
 * Notification bell icon with unread badge.
 * Polls the unread count every 60 seconds.
 */
export default function NotificationBell() {
  const [count, setCount] = useState(0);

  async function refresh() {
    try {
      const res = await getUnreadCount();
      setCount(res.data?.count ?? 0);
    } catch {
      // silently ignore — bell degrades gracefully
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
      className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100 transition-colors"
      aria-label={`Notifications${count > 0 ? `, ${count} unread` : ''}`}
    >
      {/* Bell icon (SVG) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 text-slate-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>

      {/* Unread badge */}
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
