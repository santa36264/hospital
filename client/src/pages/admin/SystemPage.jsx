import { useEffect, useState } from 'react';
import { getSystemOverview } from '../../api/adminSystemApi';
import {
  PageHeader,
  StatCard,
  ReportCard,
  LoadingState,
  ErrorState,
} from '../../components/reports';

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
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title="System Overview" subtitle="Safe, high-level system information for administrators." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Users" value={data.counts.totalUsers} />
        <StatCard label="Active Users" value={data.counts.activeUsers} />
        <StatCard label="Active Datasets" value={data.counts.activeDatasets} />
        <StatCard label="Open Periods" value={data.counts.openPeriods} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportCard>
          <h3 className="font-semibold text-slate-800 mb-3">Application</h3>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Name</dt><dd>{data.application}</dd>
            <dt className="text-slate-500">API Version</dt><dd>{data.apiVersion}</dd>
            <dt className="text-slate-500">Environment</dt><dd>{data.environment}</dd>
            <dt className="text-slate-500">Version</dt><dd>{data.version}</dd>
            <dt className="text-slate-500">Database</dt>
            <dd>
              <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${data.database === 'ok' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {data.database}
              </span>
            </dd>
          </dl>
        </ReportCard>

        <ReportCard>
          <h3 className="font-semibold text-slate-800 mb-3">Users by Role</h3>
          <table className="w-full text-sm">
            <tbody>
              {(data.usersByRole || []).map((r) => (
                <tr key={r.role} className="border-t border-slate-100">
                  <td className="py-2 text-slate-700">{r.role}</td>
                  <td className="py-2 text-right font-medium">{r.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ReportCard>
      </div>
    </div>
  );
}

export default SystemPage;
