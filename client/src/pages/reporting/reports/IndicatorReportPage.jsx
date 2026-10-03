import { useEffect, useState } from 'react';
import { getDatasets } from '../../../api/datasetApi';
import { getReportingPeriods } from '../../../api/reportingPeriodApi';
import { getIndicators } from '../../../api/indicatorApi';
import { getIndicatorReport } from '../../../api/reportApi';
import {
  PageHeader, StatCard, FilterBar, FilterGroup, selectClass,
  ReportCard, ReportCardHeader, StatusBadge, formatIndicatorValue,
  LoadingState, EmptyState, ErrorState, NoApprovedData,
} from '../../../components/reports';

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function IndicatorReportPage() {
  const [datasets, setDatasets] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [indicators, setIndicators] = useState([]);

  const [datasetId, setDatasetId] = useState('');
  const [indicatorId, setIndicatorId] = useState('');
  const [periodId, setPeriodId] = useState('');

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingIndicators, setLoadingIndicators] = useState(false);
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

  // Load indicators when dataset changes
  useEffect(() => {
    setIndicatorId('');
    setIndicators([]);
    if (!datasetId) return;
    setLoadingIndicators(true);
    getIndicators({ dataset_id: datasetId, status: 'ACTIVE' })
      .then(res => setIndicators(res.data || []))
      .catch(() => setIndicators([]))
      .finally(() => setLoadingIndicators(false));
  }, [datasetId]);

  async function handleGenerate(e) {
    e?.preventDefault();
    if (!datasetId || !indicatorId || !periodId) return;
    setLoading(true);
    setError('');
    setReport(null);
    setGenerated(true);
    try {
      const res = await getIndicatorReport({
        datasetId: Number(datasetId),
        indicatorId: Number(indicatorId),
        reportingPeriodId: Number(periodId),
      });
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  }

  const canGenerate = datasetId && indicatorId && periodId;

  return (
    <div>
      <PageHeader
        title="Indicator Report"
        subtitle="View the approved value for a specific indicator, dataset, and reporting period."
      />

      <FilterBar>
        <FilterGroup label="Dataset">
          <select value={datasetId} onChange={e => setDatasetId(e.target.value)} className={selectClass}>
            <option value="">— Select dataset —</option>
            {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </FilterGroup>
        <FilterGroup label="Indicator">
          <select
            value={indicatorId}
            onChange={e => setIndicatorId(e.target.value)}
            disabled={!datasetId || loadingIndicators}
            className={selectClass}
          >
            <option value="">{loadingIndicators ? 'Loading…' : '— Select indicator —'}</option>
            {indicators.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
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
            disabled={!canGenerate || loading}
            className="rounded-lg bg-blue-600 text-white px-5 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Generating…' : 'View Report'}
          </button>
        </div>
      </FilterBar>

      {loading && <LoadingState message="Looking up indicator value…" />}
      {error && <ErrorState message={error} onRetry={handleGenerate} />}

      {!loading && !error && !generated && (
        <EmptyState
         
          title="Select filters to view indicator data"
          message="Choose a dataset, then select an indicator and a reporting period. Only indicators belonging to the selected dataset are shown."
        />
      )}

      {!loading && !error && generated && report && !report.submission && (
        <NoApprovedData
          datasetName={report.dataset?.name}
          periodLabel={report.period?.label}
        />
      )}

      {!loading && !error && report && report.submission && (
        <div className="space-y-5">
          {/* Value highlight card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 px-6 py-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Indicator</p>
                <h3 className="text-xl font-bold text-slate-800">{report.indicator.name}</h3>
                <p className="font-mono text-xs text-slate-400 mt-0.5">{report.indicator.code}</p>
                {report.indicator.description && (
                  <p className="text-sm text-slate-500 mt-1">{report.indicator.description}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Approved Value</p>
                {report.value !== null && report.value !== undefined && String(report.value).trim() !== '' ? (
                  <p className="text-4xl font-bold text-blue-600">
                    {formatIndicatorValue(report.value, report.indicator.data_type)}
                  </p>
                ) : (
                  <p className="text-slate-400 italic text-sm">Not entered</p>
                )}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Dataset</p>
                <p className="text-slate-700 mt-0.5">{report.dataset.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Period</p>
                <p className="text-slate-700 mt-0.5">{report.period.label}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Data Type</p>
                <span className="inline-block rounded bg-slate-100 text-slate-600 px-2 py-0.5 text-xs mt-0.5">
                  {report.indicator.data_type}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Status</p>
                <div className="mt-0.5"><StatusBadge status={report.submission.status} /></div>
              </div>
            </div>
          </div>

          {/* Submission context */}
          <ReportCard>
            <ReportCardHeader
              title="Submission Context"
              badge={<StatusBadge status={report.submission.status} />}
            />
            <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Submitted By</p>
                <p className="text-slate-700 mt-0.5">{report.submission.owner_name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Submitted</p>
                <p className="text-slate-700 mt-0.5">{formatDate(report.submission.submitted_at)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Approved</p>
                <p className="text-slate-700 mt-0.5">{formatDate(report.submission.approved_at)}</p>
              </div>
            </div>
          </ReportCard>
        </div>
      )}
    </div>
  );
}

