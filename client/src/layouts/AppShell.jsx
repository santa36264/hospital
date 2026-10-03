import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../components/NotificationBell';

const NAV_BY_ROLE = {
  ADMIN: [
    { to: '/app/admin', label: 'Dashboard' },
    { to: '/app/admin/users', label: 'Users' },
    { to: '/app/admin/datasets', label: 'Datasets' },
    { to: '/app/admin/indicators', label: 'Indicators' },
    { to: '/app/admin/reporting-periods', label: 'Reporting Periods' },
    { to: '/app/admin/audit-logs', label: 'Audit Logs' },
    { to: '/app/admin/system', label: 'System' },
  ],
  DATA_ENTRY: [
    { to: '/app/data-entry/submissions', label: 'My Submissions' },
    { to: '/app/data-entry/submissions/new', label: 'New Submission' },
    { to: '/app/notifications', label: 'Notifications' },
  ],
  REPORTING: [
    { to: '/app/reporting/queue', label: 'Review Queue' },
    { to: '/app/reporting/reports/dataset', label: 'Dataset Report' },
    { to: '/app/reporting/reports/monthly', label: 'Monthly Report' },
    { to: '/app/reporting/reports/indicator', label: 'Indicator Report' },
    { to: '/app/reporting/reports/custom', label: 'Custom Report' },
    { to: '/app/reporting/reports/submission-status', label: 'Submission Status' },
    { to: '/app/reporting/reports/history', label: 'Report History' },
    { to: '/app/manager/dashboard', label: 'Dashboard' },
    { to: '/app/manager/analysis', label: 'Indicator Analysis' },
    { to: '/app/notifications', label: 'Notifications' },
  ],
  MANAGER: [
    { to: '/app/manager/dashboard', label: 'Dashboard' },
    { to: '/app/manager/analysis', label: 'Indicator Analysis' },
    { to: '/app/notifications', label: 'Notifications' },
  ],
};

const navLinkClass = ({ isActive }) =>
  `block px-3 py-2 rounded text-sm transition-colors ${
    isActive
      ? 'bg-slate-700 text-white font-medium'
      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
  }`;

function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = NAV_BY_ROLE[user?.role] || [];

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Sidebar */}
      <aside className="w-60 bg-slate-800 text-slate-100 flex flex-col shrink-0">
        {/* Logo / brand */}
        <div className="px-5 py-5 border-b border-slate-700">
          <h2 className="text-base font-bold text-white leading-tight">
            Hospital Health Data
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Management System</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavLink to="/app" end className={navLinkClass}>
            Dashboard
          </NavLink>
          {navItems
            .filter(item => item.label !== 'Notifications')
            .map(item => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
        </nav>

        {/* User info + logout */}
        <div className="px-4 py-4 border-t border-slate-700">
          <div className="mb-3">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <span className="inline-block mt-1 rounded bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
              {user?.role}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full rounded bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm text-slate-200 transition-colors text-left"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
          <h1 className="text-base font-semibold text-slate-700">
            Hospital Health Data Management
          </h1>
          <div className="flex items-center gap-3">
            {/* Notification bell — visible for all authenticated roles */}
            <NotificationBell />
            <Link
              to="/app/notifications"
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Notifications
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;
