import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDatasets } from '../../../api/datasetApi';
import { getReportingPeriods } from '../../../api/reportingPeriodApi';
import { getDatasetReport } from '../../../api/reportApi';
import {
  PageHeader, StatCard, FilterBar, FilterGroup, selectClass,
  ReportCard, ReportCardHeader, StatusBadge, formatIndicatorValue,
  ReportTable, TableHead, LoadingState, EmptyState, ErrorState, NoApprovedData,
} from '../../../components/reports';

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function ValueCell({ indicator, valuesMap }) {
  const entry = valuesMap[indicator.id];
  const raw = entry ? entry.value : null;
  const isEmpty = raw === null || raw === undefined || String(raw).trim() === '';
  if (isEmpty) {
    return <span className="text-slate-400 italic text-xs">Not entered</span>;
  }
  const formatted = formatIndicatorValue(raw, indicator.data_type);
  return <span className="font-mono text-slate-800 font-medium">{formatted}</span>;
}

export default function DatasetReportPage() {
  const [datasets, setDatasets] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [datasetId, setDatasetId] = useState('');
  const [periodId, setPeriodId] = useState('');

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    Promise.all([
      getDatasets({ status: 'ACTIVE' }).catch(() => ({ data: [] })),
      getReportingPeriods({}).catch(() => ({ data: [] })),
    ]).then(([dRes, pRes]) => {
      setDatasets(dRes.data || []);
      setPeriods(pRes.data || []);
    });
  }, []);

  async function handleGenerate(e) {
    e.preventDefault();
    if (!datasetId || !periodId) return;
    setLoading(true);
    setError('');
    setReport(null);
    setGenerated(true);
    try {
      const res = await getDatasetReport({ datasetId: Number(datasetId), reportingPeriodId: Number(periodId) });
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Dataset Report"
        subtitle="View approved indicator values for a dataset and reporting period."
      />

      {/* Filters */}
      <FilterBar>
        <FilterGroup label="Dataset">
          <select value={datasetId} onChange={e => setDatasetId(e.target.value)} className={selectClass}>
            <option value="">— Select dataset —</option>
            {datasets.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
          </select>
        </FilterGroup>
        <FilterGroup label="Reporting Period">
          <select value={periodId} onChange={e => setPeriodId(e.target.value)} className={selectClass}>
            <option value="">— Select period —</option>
            {periods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </FilterGroup>
        <div className="flex items-end">
          <button
            onClick={handleGenerate}
            disabled={!datasetId || !periodId || loading}
            className="rounded-lg bg-blue-600 text-white px-5 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Generating…' : 'View Report'}
          </button>
        </div>
      </FilterBar>

      {/* States */}
      {loading && <LoadingState message="Generating dataset report…" />}
      {error && <ErrorState message={error} onRetry={handleGenerate} />}

      {!loading && !error && !generated && (
        <EmptyState
         
          title="Select a dataset and period"
          message="Choose an active dataset and a reporting period above to view the approved indicator values."
        />
      )}

      {!loading && !error && generated && report && !report.submission && (
        <NoApprovedData datasetName={report.dataset?.name} periodLabel={report.period?.label} />
      )}

      {/* Report */}
      {!loading && !error && report && report.submission && (
        <div className="space-y-5">
          {/* Summary card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Dataset" value={report.dataset.code} sub={report.dataset.name} accent="border-blue-400" />
            <StatCard label="Period" value={report.period.label} sub={report.period.period_type} accent="border-teal-400" />
            <StatCard label="Status" value="APPROVED" accent="border-green-400" />
            <StatCard label="Approved" value={formatDate(report.submission.approved_at)} accent="border-green-300" />
          </div>

          {/* Submission info */}
          <ReportCard>
            <ReportCardHeader
              title="Submission Information"
              badge={<StatusBadge status={report.submission.status} />}
            />
            <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Submitted By</p>
                <p className="text-slate-700 mt-0.5 font-medium">{report.submission.owner_name}</p>
                <p className="text-slate-400 text-xs">{report.submission.owner_email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Submitted</p>
                <p className="text-slate-700 mt-0.5">{formatDate(report.submission.submitted_at)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Approved</p>
                <p className="text-slate-700 mt-0.5">{formatDate(report.submission.approved_at)}</p>
              </div>
            </div>
          </ReportCard>

          {/* Indicator values */}
          <ReportCard>
            <ReportCardHeader
              title={`Indicator Results — ${report.indicators.length} active indicators`}
              meta={`${report.dataset.name} · ${report.period.label}`}
            />
            {report.indicators.length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-400 text-sm">No active indicators for this dataset.</div>
            ) : (
              <ReportTable>
                <TableHead cols={[
                  { label: 'Indicator' },
                  { label: 'Code' },
                  { label: 'Type' },
                  { label: 'Required' },
                  { label: 'Value', right: true },
                ]} />
                <tbody>
                  {report.indicators.map(ind => (
                    <tr key={ind.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{ind.name}</p>
                        {ind.description && <p className="text-xs text-slate-400 mt-0.5">{ind.description}</p>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{ind.code}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded bg-slate-100 text-slate-600 px-2 py-0.5 text-xs">
                          {ind.data_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {ind.required ? <span className="text-red-500 font-medium">Required</span> : 'Optional'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ValueCell indicator={ind} valuesMap={report.valuesMap} />
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

