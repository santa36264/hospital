import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMySubmissions } from '../../api/submissionApi';
import { getDatasets } from '../../api/datasetApi';
import { getReportingPeriods } from '../../api/reportingPeriodApi';
import StatusBadge from '../../components/StatusBadge';

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function actionLabel(status) {
  if (status === 'DRAFT') return 'Continue';
  if (status === 'RETURNED') return 'Correct';
  return 'View';
}

function SubmissionStatusBadge({ status }) {
  const colours = {
    DRAFT: 'bg-amber-100 text-amber-800',
    SUBMITTED: 'bg-blue-100 text-blue-800',
    UNDER_REVIEW: 'bg-purple-100 text-purple-800',
    RETURNED: 'bg-red-100 text-red-800',
    APPROVED: 'bg-green-100 text-green-800',
  };
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${colours[status] || 'bg-slate-200 text-slate-600'}`}
    >
      {status}
    </span>
  );
}

function MySubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('');
  const [datasetFilter, setDatasetFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (datasetFilter) params.dataset_id = datasetFilter;
      if (periodFilter) params.reporting_period_id = periodFilter;

      const res = await getMySubmissions(params);
      setSubmissions(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  }

  // Load filter options once on mount
  useEffect(() => {
    Promise.all([
      getDatasets({ status: 'ACTIVE' }).catch(() => ({ data: [] })),
      getReportingPeriods().catch(() => ({ data: [] })),
    ]).then(([dRes, pRes]) => {
      setDatasets(dRes.data || []);
      setPeriods(pRes.data || []);
    });
  }, []);

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, datasetFilter, periodFilter]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">My Submissions</h2>
          <p className="text-slate-500 text-sm">Your data-entry submissions across all datasets and periods.</p>
        </div>
        <Link
          to="/app/data-entry/submissions/new"
          className="rounded bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700"
        >
          + New Submission
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="DRAFT">DRAFT</option>
          <option value="SUBMITTED">SUBMITTED</option>
          <option value="UNDER_REVIEW">UNDER_REVIEW</option>
          <option value="RETURNED">RETURNED</option>
          <option value="APPROVED">APPROVED</option>
        </select>

        <select
          value={datasetFilter}
          onChange={(e) => setDatasetFilter(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All datasets</option>
          {datasets.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        <select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All periods</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-3 rounded bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>
      )}

      <div className="bg-white rounded shadow overflow-x-auto">
        {loading ? (
          <p className="p-4 text-slate-500">Loading…</p>
        ) : submissions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500 mb-3">No submissions found.</p>
            <Link
              to="/app/data-entry/submissions/new"
              className="inline-block rounded bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700"
            >
              Start your first submission
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2">Dataset</th>
                <th className="text-left px-4 py-2">Reporting Period</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Last Updated</th>
                <th className="text-right px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{s.dataset_name}</span>
                    <span className="ml-1 font-mono text-xs text-slate-400">({s.dataset_code})</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.period_label}</td>
                  <td className="px-4 py-3">
                    <SubmissionStatusBadge status={s.status} />
                    {s.period_status === 'CLOSED' && (
                      <span className="ml-2 text-xs text-slate-400 italic">period closed</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(s.updated_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/app/data-entry/submissions/${s.id}`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      {actionLabel(s.status)}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export { SubmissionStatusBadge };
export default MySubmissionsPage;
