import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const QUICK_LINKS = {
  ADMIN: [
    { to: '/app/admin', label: 'Admin Dashboard: system status and recent activity' },
    { to: '/app/admin/users', label: 'Manage users, roles, and account status' },
    { to: '/app/admin/datasets', label: 'Configure datasets and indicators' },
    { to: '/app/admin/audit-logs', label: 'Review audit logs' },
  ],
  DATA_ENTRY: [
    { to: '/app/data-entry/submissions', label: 'View your submissions' },
    { to: '/app/data-entry/submissions/new', label: 'Start a new submission' },
    { to: '/app/notifications', label: 'Notifications' },
  ],
  REPORTING: [
    { to: '/app/reporting/queue', label: 'Review submissions awaiting review' },
    { to: '/app/reporting/reports/dataset', label: 'Generate dataset reports' },
    { to: '/app/reporting/reports/custom', label: 'Build a custom report' },
    { to: '/app/manager/dashboard', label: 'Management analytics dashboard' },
  ],
  MANAGER: [
    { to: '/app/manager/dashboard', label: 'Approved-data analytics dashboard' },
    { to: '/app/manager/analysis', label: 'Indicator analysis' },
    { to: '/app/notifications', label: 'Notifications' },
  ],
};

function AppHome() {
  const { user } = useAuth();
  const links = QUICK_LINKS[user?.role] || [];
  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-800 mb-2">
        Welcome, {user?.name}
      </h2>
      <p className="text-slate-600 mb-6">
        You are signed in as <strong>{user?.role}</strong>.
      </p>
      <div className="bg-white rounded-lg shadow-sm border border-slate-100 p-6">
        <h3 className="font-semibold text-slate-700 mb-3">Common tasks</h3>
        <ul className="space-y-2">
          {links.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className="text-blue-600 hover:underline text-sm flex items-start gap-2">
                <span aria-hidden>→</span><span>{l.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function UnauthorizedPage() {
  return (
    <div className="p-6 text-center">
      <h2 className="text-xl font-semibold text-red-600">403 — Unauthorized</h2>
      <p className="text-slate-600">You do not have access to this area.</p>
    </div>
  );
}

export { AppHome, UnauthorizedPage };
