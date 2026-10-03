import { useEffect, useState } from 'react';
import { getDatasets } from '../../../api/datasetApi';
import { getReportingPeriods } from '../../../api/reportingPeriodApi';
import { getSubmissionStatusReport } from '../../../api/reportApi';
import {
  PageHeader, FilterBar, FilterGroup, selectClass, inputClass,
  ReportCard, StatusBadge, ReportTable, TableHead,
  LoadingState, EmptyState, ErrorState, Pagination,
} from '../../../components/reports';

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function SubmissionStatusPage() {
  const [datasets, setDatasets] = useState([]);
  const [periods, setPeriods] = useState([]);

  const [datasetFilter, setDatasetFilter] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      getDatasets({}).catch(() => ({ data: [] })),
      getReportingPeriods({}).catch(() => ({ data: [] })),
    ]).then(([dRes, pRes]) => {
      setDatasets(dRes.data || []);
      setPeriods(pRes.data || []);
    });
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getSubmissionStatusReport({
        datasetId: datasetFilter || undefined,
        reportingPeriodId: periodFilter || undefined,
        status: statusFilter || undefined,
        search: search || undefined,
        page,
      });
      setResult({ data: res.data, meta: res.meta });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetFilter, periodFilter, statusFilter, search, page]);

  function handleFilterChange(setter) {
    return (e) => { setter(e.target.value); setPage(1); };
  }

  return (
    <div>
      <PageHeader
        title="Submission Status Report"
        subtitle="Workflow overview for all submissions across datasets and periods."
      />

      <FilterBar>
        <FilterGroup label="Search">
          <input
            placeholder="Dataset, period, user…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className={`${inputClass} w-52`}
          />
        </FilterGroup>
        <FilterGroup label="Status">
          <select value={statusFilter} onChange={handleFilterChange(setStatusFilter)} className={selectClass}>
            <option value="">All statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="SUBMITTED">SUBMITTED</option>
            <option value="UNDER_REVIEW">UNDER_REVIEW</option>
            <option value="RETURNED">RETURNED</option>
            <option value="APPROVED">APPROVED</option>
          </select>
        </FilterGroup>
        <FilterGroup label="Dataset">
          <select value={datasetFilter} onChange={handleFilterChange(setDatasetFilter)} className={selectClass}>
            <option value="">All datasets</option>
            {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </FilterGroup>
        <FilterGroup label="Period">
          <select value={periodFilter} onChange={handleFilterChange(setPeriodFilter)} className={selectClass}>
            <option value="">All periods</option>
            {periods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </FilterGroup>
      </FilterBar>

      {loading && <LoadingState message="Loading submission status…" />}
      {error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && result && (
        <ReportCard>
          {result.data.length === 0 ? (
            <EmptyState
             
              title="No submissions found"
              message="No submissions match the selected filters."
            />
          ) : (
            <>
              <ReportTable>
                <TableHead cols={[
                  { label: 'Dataset' },
                  { label: 'Period' },
                  { label: 'Data Entry User' },
                  { label: 'Status' },
                  { label: 'Submitted' },
                  { label: 'Reviewed' },
                  { label: 'Approved' },
                  { label: 'Returned' },
                ]} />
                <tbody>
                  {result.data.map(s => (
                    <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800 text-sm">{s.dataset_name}</p>
                        <p className="font-mono text-xs text-slate-400">{s.dataset_code}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-sm">{s.period_label}</td>
                      <td className="px-4 py-3">
                        <p className="text-slate-700 text-sm">{s.owner_name}</p>
                        <p className="text-xs text-slate-400">{s.owner_email}</p>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                      <td className="px-4 py-3 text-slate-500 text-sm">{formatDate(s.submitted_at)}</td>
                      <td className="px-4 py-3 text-slate-500 text-sm">{formatDate(s.reviewed_at)}</td>
                      <td className="px-4 py-3 text-slate-500 text-sm">{formatDate(s.approved_at)}</td>
                      <td className="px-4 py-3 text-slate-500 text-sm">{formatDate(s.returned_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </ReportTable>
              <Pagination meta={result.meta} onPage={setPage} />
            </>
          )}
        </ReportCard>
      )}
    </div>
  );
}

