import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getDataEntryDashboard } from '../../api/analyticsApi';
import {
  PageHeader, StatCard, ReportCard, ReportCardHeader,
  ReportTable, TableHead, StatusBadge, LoadingState, ErrorState, EmptyState,
} from '../../components/reports';

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function actionLabel(status) {
  if (status === 'DRAFT') return 'Continue';
  if (status === 'RETURNED') return 'Correct';
  return 'View';
}

function actionClass(status) {
  if (status === 'RETURNED')
    return 'inline-block rounded px-3 py-1 text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100';
  if (status === 'DRAFT')
    return 'inline-block rounded px-3 py-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100';
  return 'inline-block rounded px-3 py-1 text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100';
}

export default function DataEntryDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getDataEntryDashboard();
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const returned = data?.stats?.RETURNED ?? 0;
  const draft = data?.stats?.DRAFT ?? 0;

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name}`}
        subtitle="Your health-data submission activity at a glance."
      />

      {loading && <LoadingState message="Loading your dashboard…" />}
      {error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && data && (
        <div className="space-y-5">

          {/* Attention banner — returned submissions */}
          {returned > 0 && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-red-800">
                  {returned} submission{returned > 1 ? 's' : ''} returned for correction
                </p>
                <p className="text-sm text-red-600 mt-0.5">
                  Review the return reason and resubmit when corrected.
                </p>
              </div>
              <Link
                to="/app/data-entry/submissions?status=RETURNED"
                className="shrink-0 rounded-lg bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Review now
              </Link>
            </div>
          )}

          {/* Draft reminder */}
          {draft > 0 && returned === 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-amber-800">
                  {draft} draft submission{draft > 1 ? 's' : ''} in progress
                </p>
                <p className="text-sm text-amber-600 mt-0.5">
                  Complete and submit before the reporting period closes.
                </p>
              </div>
              <Link
                to="/app/data-entry/submissions?status=DRAFT"
                className="shrink-0 rounded-lg bg-amber-600 text-white px-4 py-2 text-sm font-medium hover:bg-amber-700 transition-colors"
              >
                Continue drafts
              </Link>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard
              label="Draft"
              value={data.stats.DRAFT}
              accent="border-amber-400"
              sub="in progress"
            />
            <StatCard
              label="Submitted"
              value={data.stats.SUBMITTED}
              accent="border-blue-400"
              sub="awaiting review"
            />
            <StatCard
              label="Under Review"
              value={data.stats.UNDER_REVIEW}
              accent="border-purple-400"
              sub="being reviewed"
            />
            <StatCard
              label="Returned"
              value={data.stats.RETURNED}
              accent={data.stats.RETURNED > 0 ? 'border-red-400' : 'border-slate-300'}
              sub="needs correction"
            />
            <StatCard
              label="Approved"
              value={data.stats.APPROVED}
              accent="border-green-400"
              sub="completed"
            />
          </div>

          {/* Open periods + quick action */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ReportCard>
              <div className="px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Open Reporting Periods
                  </p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">
                    {data.stats.openPeriods}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">available for new submissions</p>
                </div>
              </div>
            </ReportCard>

            <ReportCard>
              <div className="px-5 py-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Quick Actions
                </p>
                <div className="space-y-2">
                  <Link
                    to="/app/data-entry/submissions/new"
                    className="block w-full rounded-lg bg-blue-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-blue-700 transition-colors text-center"
                  >
                    + New Submission
                  </Link>
                  <Link
                    to="/app/data-entry/submissions"
                    className="block w-full rounded-lg border border-slate-300 text-slate-700 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 transition-colors text-center"
                  >
                    View All Submissions
                  </Link>
                </div>
              </div>
            </ReportCard>
          </div>

          {/* Recent submissions */}
          <ReportCard>
            <ReportCardHeader
              title="Recent Submissions"
              meta="Your latest 8 submissions across all datasets and periods"
            />
            {data.recentSubmissions.length === 0 ? (
              <EmptyState
                icon={null}
                title="No submissions yet"
                message="Start a new submission to begin entering health data."
                action={
                  <Link
                    to="/app/data-entry/submissions/new"
                    className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
                  >
                    Start a submission
                  </Link>
                }
              />
            ) : (
              <ReportTable>
                <TableHead cols={[
                  { label: 'Dataset' },
                  { label: 'Period' },
                  { label: 'Status' },
                  { label: 'Last Updated' },
                  { label: 'Action', right: true },
                ]} />
                <tbody>
                  {data.recentSubmissions.map(s => (
                    <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800 text-sm">{s.dataset_name}</span>
                        <span className="ml-1.5 font-mono text-xs text-slate-400">({s.dataset_code})</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-sm">
                        {s.period_label}
                        {s.period_status === 'CLOSED' && (
                          <span className="ml-1.5 text-xs text-slate-400 italic">closed</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-sm">
                        {formatDate(s.updated_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link to={`/app/data-entry/submissions/${s.id}`} className={actionClass(s.status)}>
                          {actionLabel(s.status)}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ReportTable>
            )}
          </ReportCard>

        </div>
      )}
    </div>
  );
}
