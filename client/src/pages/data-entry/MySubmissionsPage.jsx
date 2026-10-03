import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getMySubmissions } from '../../api/submissionApi';
import { getDatasets } from '../../api/datasetApi';
import { getReportingPeriods } from '../../api/reportingPeriodApi';
import {
  PageHeader, FilterBar, FilterGroup, Card,
  LoadingState, EmptyState, ErrorState,
  StatusBadge, Button, Select, Notice,
  ReportTable, TableHead,
} from '../../components/reports';
import { FileText, Plus } from 'lucide-react';

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function actionLabel(status) {
  if (status === 'DRAFT')    return 'Continue';
  if (status === 'RETURNED') return 'Correct';
  return 'View';
}

function actionClass(status) {
  if (status === 'RETURNED')
    return 'inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors';
  if (status === 'DRAFT')
    return 'inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors';
  return 'inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors';
}

// Export SubmissionStatusBadge for use in other pages (ReviewDetailPage, SubmissionQueuePage)
export function SubmissionStatusBadge({ status }) {
  return <StatusBadge status={status} />;
}

function MySubmissionsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  const statusFilter  = searchParams.get('status')              || '';
  const datasetFilter = searchParams.get('dataset_id')          || '';
  const periodFilter  = searchParams.get('reporting_period_id') || '';

  function setFilter(key, value) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      return next;
    });
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter)  params.status               = statusFilter;
      if (datasetFilter) params.dataset_id            = datasetFilter;
      if (periodFilter)  params.reporting_period_id   = periodFilter;
      const res = await getMySubmissions(params);
      setSubmissions(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([
      getDatasets({ status: 'ACTIVE' }).catch(() => ({ data: [] })),
      getReportingPeriods().catch(() => ({ data: [] })),
    ]).then(([dRes, pRes]) => {
      setDatasets(dRes.data || []);
      setPeriods(pRes.data || []);
    });
  }, []);

  useEffect(() => { load(); }, [statusFilter, datasetFilter, periodFilter]); // eslint-disable-line

  const returnedCount = submissions.filter(s => s.status === 'RETURNED').length;

  return (
    <div>
      <PageHeader
        title="My Submissions"
        subtitle="Your health-data submissions across all datasets and reporting periods."
        action={
          <Button as={Link} to="/app/data-entry/submissions/new">
            <Plus className="w-4 h-4" aria-hidden />
            New Submission
          </Button>
        }
      />

      {returnedCount > 0 && (
        <Notice variant="danger" className="mb-4">
          {returnedCount} submission{returnedCount > 1 ? 's' : ''} returned for correction. Review the return reason and resubmit.
        </Notice>
      )}

      <FilterBar>
        <FilterGroup label="Status">
          <Select value={statusFilter} onChange={e => setFilter('status', e.target.value)}>
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="RETURNED">Returned</option>
            <option value="APPROVED">Approved</option>
          </Select>
        </FilterGroup>
        <FilterGroup label="Dataset">
          <Select value={datasetFilter} onChange={e => setFilter('dataset_id', e.target.value)}>
            <option value="">All datasets</option>
            {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </FilterGroup>
        <FilterGroup label="Period">
          <Select value={periodFilter} onChange={e => setFilter('reporting_period_id', e.target.value)}>
            <option value="">All periods</option>
            {periods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </Select>
        </FilterGroup>
      </FilterBar>

      {error && <Notice variant="danger" onDismiss={() => setError('')} className="mb-4">{error}</Notice>}

      {loading ? (
        <LoadingState message="Loading submissions…" />
      ) : submissions.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No submissions found"
          message={statusFilter || datasetFilter || periodFilter
            ? 'Try adjusting your filters.'
            : 'Start a new submission to begin entering health data.'}
          action={!statusFilter && !datasetFilter && !periodFilter ? (
            <Link to="/app/data-entry/submissions/new">
              <Button>Start a Submission</Button>
            </Link>
          ) : undefined}
        />
      ) : (
        <Card>
          <ReportTable>
            <TableHead cols={[
              { label: 'Dataset' },
              { label: 'Reporting Period' },
              { label: 'Status' },
              { label: 'Last Updated' },
              { label: 'Action', right: true },
            ]} />
            <tbody>
              {submissions.map(s => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{s.dataset_name}</span>
                    <span className="ml-1.5 font-mono text-xs text-slate-400">({s.dataset_code})</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {s.period_label}
                    {s.period_status === 'CLOSED' && (
                      <span className="ml-1.5 text-xs text-slate-400 italic">· closed</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{formatDate(s.updated_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/app/data-entry/submissions/${s.id}`} className={actionClass(s.status)}>
                      {actionLabel(s.status)}
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

export default MySubmissionsPage;
