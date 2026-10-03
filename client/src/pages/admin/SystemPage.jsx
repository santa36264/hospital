import { useEffect, useState } from 'react';
import { getSystemOverview } from '../../api/adminSystemApi';
import {
  PageHeader, Card, CardHeader, CardBody, StatCard,
  LoadingState, ErrorState,
} from '../../components/reports';
import { CheckCircle, XCircle } from 'lucide-react';

function HealthIndicator({ label, status }) {
  const ok = status === 'ok' || status === true;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-700">{label}</span>
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${ok ? 'text-green-700' : 'text-red-600'}`}>
        {ok
          ? <CheckCircle className="w-4 h-4" aria-hidden />
          : <XCircle className="w-4 h-4" aria-hidden />
        }
        {ok ? 'Operational' : 'Issue detected'}
      </span>
    </div>
  );
}

const ROLE_COLORS = {
  ADMIN:      'bg-blue-100 text-blue-800',
  DATA_ENTRY: 'bg-emerald-100 text-emerald-800',
  REPORTING:  'bg-purple-100 text-purple-800',
  MANAGER:    'bg-teal-100 text-teal-800',
};

function SystemPage() {
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
      setError(err.response?.data?.message || 'Failed to load system overview.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingState message="Loading system overview…" />;
  if (error)   return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="System"
        subtitle="Technical status and configuration summary for administrators."
      />

      {/* Config counts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Users"     value={data.counts.totalUsers}       accent="border-slate-400" />
        <StatCard label="Active Datasets" value={data.counts.activeDatasets}   accent="border-blue-400"  />
        <StatCard label="Indicators"      value={data.counts.activeIndicators} accent="border-purple-400"/>
        <StatCard label="Open Periods"    value={data.counts.openPeriods}      accent="border-amber-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Application info */}
        <Card>
          <CardHeader title="Application" />
          <CardBody>
            <dl className="space-y-2.5 text-sm">
              {[
                { label: 'Name',        value: data.application  },
                { label: 'API Version', value: data.apiVersion   },
                { label: 'Environment', value: data.environment  },
                { label: 'Version',     value: data.version      },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
                  <dt className="text-slate-500 font-medium">{label}</dt>
                  <dd className="text-slate-800 font-medium text-right">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>

        {/* System health */}
        <Card>
          <CardHeader title="System Health" />
          <CardBody>
            <HealthIndicator label="Database"           status={data.database} />
            <HealthIndicator label="API"                status="ok" />
            <HealthIndicator label="Authentication"     status="ok" />
            <HealthIndicator label="Session Management" status="ok" />
          </CardBody>
        </Card>

        {/* Users by role */}
        <Card>
          <CardHeader title="Users by Role" />
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Active</th>
                </tr>
              </thead>
              <tbody>
                {(data.usersByRole || []).map((r) => (
                  <tr key={r.role} className="border-t border-slate-100">
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[r.role] || 'bg-slate-100 text-slate-700'}`}>
                        {r.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-slate-800">{r.total}</td>
                    <td className="px-6 py-3 text-right text-slate-500">{r.active}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        {/* Configuration summary */}
        <Card>
          <CardHeader title="Configuration Summary" />
          <CardBody>
            <dl className="space-y-1 text-sm">
              {[
                { label: 'Active Datasets',         value: data.counts.activeDatasets },
                { label: 'Active Indicators',        value: data.counts.activeIndicators },
                { label: 'Open Reporting Periods',   value: data.counts.openPeriods },
                { label: 'Closed Reporting Periods', value: data.counts.closedPeriods },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="text-slate-800 font-semibold">{value ?? '—'}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export default SystemPage;
