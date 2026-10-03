import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getReportingDashboard } from '../../api/analyticsApi';
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

function reviewActionLabel(status) {
  if (status === 'SUBMITTED') return 'Start Review';
  if (status === 'UNDER_REVIEW') return 'Continue';
  return 'View';
}

function reviewActionClass(status) {
  if (status === 'SUBMITTED')
    return 'inline-block rounded px-3 py-1 text-xs font-medium bg-blue-600 text-white hover:bg-blue-700';
  if (status === 'UNDER_REVIEW')
    return 'inline-block rounded px-3 py-1 text-xs font-medium bg-purple-600 text-white hover:bg-purple-700';
  return 'inline-block rounded px-3 py-1 text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200';
}

export default function ReportingDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getReportingDashboard();
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const pending = data?.stats?.SUBMITTED ?? 0;
  const underReview = data?.stats?.UNDER_REVIEW ?? 0;

  return (
    <div>
      <PageHeader
        title="Reporting Dashboard"
        subtitle="Monitor submission review activity and reporting progress."
      />

      {loading && <LoadingState message="Loading reporting dashboard…" />}
      {error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && data && (
        <div className="space-y-5">

          {/* Attention: submissions awaiting action */}
          {(pending + underReview) > 0 && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 px-5 py-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-blue-800">
                  {pending + underReview} submission{(pending + underReview) > 1 ? 's' : ''} require{pending + underReview === 1 ? 's' : ''} attention
                </p>
                <p className="text-sm text-blue-600 mt-0.5">
                  {pending > 0 && `${pending} awaiting review`}
                  {pending > 0 && underReview > 0 && ' · '}
                  {underReview > 0 && `${underReview} under review`}
                </p>
              </div>
              <Link
                to="/app/reporting/queue"
                className="shrink-0 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Open Review Queue
              </Link>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Awaiting Review"
              value={data.stats.SUBMITTED}
              accent="border-blue-400"
              sub="ready to start"
            />
            <StatCard
              label="Under Review"
              value={data.stats.UNDER_REVIEW}
              accent="border-purple-400"
              sub="in progress"
            />
            <StatCard
              label="Returned"
              value={data.stats.RETURNED}
              accent="border-amber-400"
              sub="with data entry"
            />
            <StatCard
              label="Approved"
              value={data.stats.APPROVED}
              accent="border-green-400"
              sub="completed"
            />
          </div>

          {/* Quick access tools */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { to: '/app/reporting/queue', label: 'Review Queue', desc: 'Start or continue reviews' },
              { to: '/app/reporting/reports/dataset', label: 'Dataset Reports', desc: 'View approved data' },
              { to: '/app/reporting/reports/custom', label: 'Custom Reports', desc: 'Build & export reports' },
              { to: '/app/manager/analysis', label: 'Indicator Analysis', desc: 'Trend & comparison' },
            ].map(item => (
              <Link key={item.to} to={item.to} className="bg-white rounded-xl shadow-sm border border-slate-100 px-4 py-3 hover:border-blue-200 hover:shadow transition-all">
                <p className="font-semibold text-slate-800 text-sm">{item.label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
              </Link>
            ))}
          </div>

          {/* Recent review activity */}
          <ReportCard>
            <ReportCardHeader
              title="Recent Submission Activity"
              meta="Latest 10 submissions in the review workflow"
              badge={
                <Link to="/app/reporting/queue" className="text-xs text-blue-600 hover:underline font-medium">
                  Full queue →
                </Link>
              }
            />
            {data.recentActivity.length === 0 ? (
              <EmptyState
                icon={null}
                title="No submissions in the review workflow"
                message="Submissions will appear here once data entry users submit their work."
              />
            ) : (
              <ReportTable>
                <TableHead cols={[
                  { label: 'Dataset' },
                  { label: 'Period' },
                  { label: 'Submitted By' },
                  { label: 'Status' },
                  { label: 'Submitted' },
                  { label: 'Action', right: true },
                ]} />
                <tbody>
                  {data.recentActivity.map(s => (
                    <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800 text-sm">{s.dataset_name}</span>
                        <span className="ml-1.5 font-mono text-xs text-slate-400">({s.dataset_code})</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-sm">{s.period_label}</td>
                      <td className="px-4 py-3 text-slate-600 text-sm">{s.owner_name}</td>
                      <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                      <td className="px-4 py-3 text-slate-500 text-sm">{formatDate(s.submitted_at)}</td>
                      <td className="px-4 py-3 text-right">
                        {['SUBMITTED', 'UNDER_REVIEW'].includes(s.status) ? (
                          <Link to={`/app/reporting/submissions/${s.id}`} className={reviewActionClass(s.status)}>
                            {reviewActionLabel(s.status)}
                          </Link>
                        ) : (
                          <span className="text-slate-400 text-xs">{reviewActionLabel(s.status)}</span>
                        )}
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
