import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getReviewQueue } from '../../api/reviewApi';
import { getDatasets } from '../../api/datasetApi';
import { getReportingPeriods } from '../../api/reportingPeriodApi';
import {
  PageHeader, FilterBar, FilterGroup, Card, StatCard,
  LoadingState, EmptyState, ErrorState, Notice,
  StatusBadge, Button, Input, Select,
  ReportTable, TableHead,
} from '../../components/reports';
import { CheckCheck } from 'lucide-react';

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function reviewActionLabel(status) {
  if (status === 'SUBMITTED')    return 'Start Review';
  if (status === 'UNDER_REVIEW') return 'Continue';
  return 'View';
}

function reviewActionClass(status) {
  if (status === 'SUBMITTED')
    return 'inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors';
  if (status === 'UNDER_REVIEW')
    return 'inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors';
  return 'inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors';
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
      if (statusFilter)  params.status              = statusFilter;
      if (datasetFilter) params.dataset_id           = datasetFilter;
      if (periodFilter)  params.reporting_period_id  = periodFilter;
      if (search)        params.search               = search;
      const res = await getReviewQueue(params);
      setSubmissions(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load review queue.');
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
  }, [statusFilter, datasetFilter, periodFilter, search]); // eslint-disable-line

  const submitted   = submissions.filter(s => s.status === 'SUBMITTED').length;
  const underReview = submissions.filter(s => s.status === 'UNDER_REVIEW').length;

  return (
    <div>
      <PageHeader
        title="Review Queue"
        subtitle="Submissions waiting for review, approval, or return."
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
        <StatCard label="Awaiting Review" value={submitted}              accent="border-blue-400"   sub="ready to start" />
        <StatCard label="Under Review"    value={underReview}            accent="border-purple-400" sub="in progress" />
        <StatCard label="Total in Queue"  value={submissions.length}     accent="border-slate-400"  sub="SUBMITTED + UNDER_REVIEW" />
      </div>

      {/* Attention alert */}
      {(submitted + underReview) > 0 && (
        <div className="rounded-xl bg-blue-50 border border-blue-200 px-5 py-4 flex items-center justify-between gap-4 mb-5">
          <p className="font-semibold text-blue-800 text-sm">
            {submitted + underReview} submission{(submitted + underReview) > 1 ? 's' : ''} require{(submitted + underReview) === 1 ? 's' : ''} attention
          </p>
        </div>
      )}

      <FilterBar>
        <FilterGroup label="Search">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Dataset, period, submitter…" className="w-60" />
        </FilterGroup>
        <FilterGroup label="Status">
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">Submitted + Under Review</option>
            <option value="SUBMITTED">Submitted only</option>
            <option value="UNDER_REVIEW">Under Review only</option>
          </Select>
        </FilterGroup>
        <FilterGroup label="Dataset">
          <Select value={datasetFilter} onChange={e => setDatasetFilter(e.target.value)}>
            <option value="">All datasets</option>
            {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </FilterGroup>
        <FilterGroup label="Period">
          <Select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)}>
            <option value="">All periods</option>
            {periods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </Select>
        </FilterGroup>
      </FilterBar>

      {error && <Notice variant="danger" onDismiss={() => setError('')} className="mb-4">{error}</Notice>}

      {loading ? (
        <LoadingState message="Loading review queue…" />
      ) : submissions.length === 0 ? (
        <EmptyState
          icon={CheckCheck}
          title="No submissions pending review"
          message="The queue is clear. New submissions will appear here once data entry users submit their work."
        />
      ) : (
        <Card>
          <ReportTable>
            <TableHead cols={[
              { label: 'Dataset' },
              { label: 'Reporting Period' },
              { label: 'Submitted By' },
              { label: 'Submitted' },
              { label: 'Status' },
              { label: 'Action', right: true },
            ]} />
            <tbody>
              {submissions.map(s => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{s.dataset_name}</span>
                    <span className="ml-1.5 font-mono text-xs text-slate-400">({s.dataset_code})</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{s.period_label}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{s.owner_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{formatDate(s.submitted_at)}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/app/reporting/submissions/${s.id}`} className={reviewActionClass(s.status)}>
                      {reviewActionLabel(s.status)}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </ReportTable>
        </Card>
      )}
    </div>
  );
}
