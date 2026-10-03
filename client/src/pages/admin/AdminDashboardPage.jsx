import { useEffect, useState } from 'react';
import { getSystemOverview } from '../../api/adminSystemApi';
import {
  PageHeader,
  StatCard,
  ReportCard,
  LoadingState,
  ErrorState,
} from '../../components/reports';

function AdminDashboardPage() {
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
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="System-level administrative overview." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Users" value={data.counts.totalUsers} />
        <StatCard label="Active Users" value={data.counts.activeUsers} />
        <StatCard label="Active Datasets" value={data.counts.activeDatasets} />
        <StatCard label="Open Periods" value={data.counts.openPeriods} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

        <ReportCard>
          <h3 className="font-semibold text-slate-800 mb-3">Recent Administrative Activity</h3>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-slate-500">No recent activity.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {data.recentActivity.map((a) => (
                <li key={a.id} className="py-2 flex justify-between gap-3">
                  <span className="text-slate-700 font-mono text-xs">{a.action}</span>
                  <span className="text-slate-400 text-xs">{new Date(a.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </ReportCard>
      </div>
    </div>
  );
}

export default AdminDashboardPage;
