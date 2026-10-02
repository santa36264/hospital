import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getReviewQueue } from '../../api/reviewApi';
import { getDatasets } from '../../api/datasetApi';
import { getReportingPeriods } from '../../api/reportingPeriodApi';
import { SubmissionStatusBadge } from '../data-entry/MySubmissionsPage';

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function queueActionLabel(status) {
  if (status === 'SUBMITTED') return 'Start Review';
  if (status === 'UNDER_REVIEW') return 'Continue Review';
  return 'View';
}

function SummaryCard({ label, value, colour }) {
  return (
    <div className={`bg-white rounded-lg shadow px-5 py-4 border-l-4 ${colour}`}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
    </div>
  );
}

export default function SubmissionQueuePage() {
  const [submissions, setSubmissions] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusFilter, setStatusFilter] = useState('');
  const [datasetFilter, setDatasetFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (datasetFilter) params.dataset_id = datasetFilter;
      if (periodFilter) params.reporting_period_id = periodFilter;
      if (search) params.search = search;
      const res = await getReviewQueue(params);
      setSubmissions(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load queue.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([
      getDatasets({}).catch(() => ({ data: [] })),
      getReportingPeriods({}).catch(() => ({ data: [] })),
    ]).then(([dRes, pRes]) => {
      setDatasets(dRes.data || []);
      setPeriods(pRes.data || []);
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, datasetFilter, periodFilter, search]);

  const submitted = submissions.filter(s => s.status === 'SUBMITTED').length;
  const underReview = submissions.filter(s => s.status === 'UNDER_REVIEW').length;

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Submission Review Queue</h2>
        <p className="text-slate-500 text-sm mt-1">
          Review submitted health-data submissions, approve or return for correction.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard label="Awaiting Review"  value={submitted}   colour="border-blue-400" />
        <SummaryCard label="Under Review"     value={underReview} colour="border-purple-400" />
        <SummaryCard label="Total in Queue"   value={submissions.length} colour="border-slate-400" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          placeholder="Search dataset, period, submitter…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm w-64"
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="SUBMITTED">SUBMITTED</option>
          <option value="UNDER_REVIEW">UNDER_REVIEW</option>
        </select>
        <select
          value={datasetFilter}
          onChange={e => setDatasetFilter(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All datasets</option>
          {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select
          value={periodFilter}
          onChange={e => setPeriodFilter(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All periods</option>
          {periods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading queue…</div>
        ) : submissions.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl mb-3">✓</div>
            <p className="text-slate-600 font-medium">No submissions pending review.</p>
            <p className="text-slate-400 text-sm mt-1">The queue is clear.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3">Dataset</th>
                <th className="text-left px-4 py-3">Reporting Period</th>
                <th className="text-left px-4 py-3">Submitted By</th>
                <th className="text-left px-4 py-3">Submitted</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map(s => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{s.dataset_name}</span>
                    <span className="ml-1 font-mono text-xs text-slate-400">({s.dataset_code})</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.period_label}</td>
                  <td className="px-4 py-3 text-slate-600">{s.owner_name}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(s.submitted_at)}</td>
                  <td className="px-4 py-3"><SubmissionStatusBadge status={s.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/app/reporting/submissions/${s.id}`}
                      className={`inline-block rounded px-3 py-1 text-xs font-medium transition-colors ${
                        s.status === 'SUBMITTED'
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      }`}
                    >
                      {queueActionLabel(s.status)}
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
