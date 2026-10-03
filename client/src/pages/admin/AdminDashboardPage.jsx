import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSystemOverview } from '../../api/adminSystemApi';
import {
  PageHeader, StatCard, Card, CardHeader, CardBody,
  LoadingState, ErrorState, StatusBadge, Notice,
} from '../../components/reports';
import { Users, Database, ListChecks, CalendarDays, Activity } from 'lucide-react';

/** Human-readable labels for audit log event codes */
const ACTION_LABELS = {
  LOGIN_SUCCESS:          'Successful login',
  LOGIN_FAILED:           'Failed login attempt',
  LOGIN_BLOCKED_INACTIVE: 'Login blocked — inactive account',
  LOGOUT:                 'User signed out',
  SESSION_REFRESHED:      'Session refreshed',
  USER_CREATED:           'User account created',
  USER_UPDATED:           'User account updated',
  USER_ACTIVATED:         'User account activated',
  USER_DEACTIVATED:       'User account deactivated',
  USER_ROLE_CHANGED:      'User role changed',
  USER_PASSWORD_CHANGED:  'Password changed',
  DATASET_CREATED:        'Dataset created',
  DATASET_UPDATED:        'Dataset updated',
  DATASET_ACTIVATED:      'Dataset activated',
  DATASET_DEACTIVATED:    'Dataset deactivated',
  INDICATOR_CREATED:      'Indicator created',
  INDICATOR_UPDATED:      'Indicator updated',
  INDICATOR_ACTIVATED:    'Indicator activated',
  INDICATOR_DEACTIVATED:  'Indicator deactivated',
  REPORTING_PERIOD_CREATED: 'Reporting period created',
  REPORTING_PERIOD_UPDATED: 'Reporting period updated',
  REPORTING_PERIOD_OPENED:  'Reporting period opened',
  REPORTING_PERIOD_CLOSED:  'Reporting period closed',
  SUBMISSION_CREATED:     'Submission created',
  SUBMISSION_SUBMITTED:   'Submission submitted',
  SUBMISSION_UPDATED:     'Submission updated',
  SUBMISSION_REVIEW_STARTED: 'Review started',
  SUBMISSION_APPROVED:    'Submission approved',
  SUBMISSION_RETURNED:    'Submission returned',
};

function humanLabel(action) {
  return ACTION_LABELS[action] || action?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) || '—';
}

function formatTs(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const ROLE_COLORS = {
  ADMIN:      'bg-blue-100 text-blue-800',
  DATA_ENTRY: 'bg-emerald-100 text-emerald-800',
  REPORTING:  'bg-purple-100 text-purple-800',
  MANAGER:    'bg-teal-100 text-teal-800',
};

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getSystemOverview();
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load admin dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingState message="Loading admin dashboard…" />;
  if (error)   return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle="System overview and recent administrative activity."
      />

      {/* Summary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Users"       value={data.counts.totalUsers}     accent="border-slate-400"  />
        <StatCard label="Active Users"      value={data.counts.activeUsers}    accent="border-blue-400"   />
        <StatCard label="Active Datasets"   value={data.counts.activeDatasets} accent="border-green-400"  />
        <StatCard label="Open Periods"      value={data.counts.openPeriods}    accent="border-amber-400"  />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Users by role */}
        <Card>
          <CardHeader
            title="Users by Role"
            action={
              <Link to="/app/admin/users" className="text-xs text-blue-600 hover:underline font-medium">
                Manage users →
              </Link>
            }
          />
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <tbody>
                {(data.usersByRole || []).map((r) => (
                  <tr key={r.role} className="border-t border-slate-100 first:border-0">
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[r.role] || 'bg-slate-100 text-slate-700'}`}>
                        {r.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-slate-800">{r.total}</td>
                    <td className="px-6 py-3 text-right">
                      <span className="text-xs text-slate-400">
                        {r.active} active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader
            title="Recent Administrative Activity"
            action={
              <Link to="/app/admin/audit-logs" className="text-xs text-blue-600 hover:underline font-medium">
                Full audit log →
              </Link>
            }
          />
          <CardBody className="p-0">
            {!data.recentActivity?.length ? (
              <p className="px-6 py-4 text-sm text-slate-500">No recent activity recorded.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.recentActivity.map((a) => (
                  <li key={a.id} className="px-6 py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800 font-medium truncate">
                        {humanLabel(a.action)}
                      </p>
                      {(a.user_name || a.user_email) && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {a.user_name || a.user_email}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-slate-400 shrink-0 mt-0.5 whitespace-nowrap">
                      {formatTs(a.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Quick links */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/app/admin/datasets',          icon: Database,     label: 'Manage Datasets' },
          { to: '/app/admin/indicators',        icon: ListChecks,   label: 'Manage Indicators' },
          { to: '/app/admin/reporting-periods', icon: CalendarDays, label: 'Reporting Periods' },
          { to: '/app/admin/users',             icon: Users,        label: 'User Management' },
        ].map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            <Icon className="w-4 h-4 shrink-0 text-slate-400" aria-hidden />
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}
