import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard } from '../../api/analyticsApi';
import { getReportingPeriods } from '../../api/reportingPeriodApi';
import { getDatasets } from '../../api/datasetApi';
import {
  PageHeader, StatCard, FilterBar, FilterGroup, selectClass,
  ReportCard, ReportCardHeader, StatusBadge, formatIndicatorValue,
  ReportTable, TableHead, LoadingState, EmptyState, ErrorState,
} from '../../components/reports';

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ─── Coverage bar ─────────────────────────────────────────────────────────────
function CoverageBar({ coverage }) {
  const { totalActive, approved, notApproved } = coverage;

  if (totalActive === 0) {
    return (
      <div className="text-sm text-slate-400 italic py-2">
        No active datasets configured.
      </div>
    );
  }

  const pct = coverage.coverage ?? 0;
  const barColour = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div>
      <div className="flex items-end justify-between mb-2">
        <div>
          <span className="text-3xl font-bold text-slate-800">{pct}%</span>
          <span className="text-sm text-slate-400 ml-2">coverage</span>
        </div>
        <div className="text-right text-xs text-slate-500">
          <span className="text-green-600 font-semibold">{approved} approved</span>
          {' · '}
          <span className="text-slate-400">{notApproved} pending</span>
          {' · '}
          <span>{totalActive} total</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden" role="progressbar"
        aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
        aria-label={`Reporting coverage: ${pct}%`}>
        <div
          className={`h-4 rounded-full transition-all duration-500 ${barColour}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>

      {/* Accessible text alternative */}
      <p className="text-xs text-slate-400 mt-2">
        {approved} of {totalActive} active datasets have an approved submission for this period.
      </p>
    </div>
  );
}

// ─── Dataset status row ───────────────────────────────────────────────────────
function DatasetStatusRow({ row, periodId }) {
  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <p className="font-medium text-slate-800 text-sm">{row.dataset_name}</p>
        <p className="font-mono text-xs text-slate-400">{row.dataset_code}</p>
      </td>
      <td className="px-4 py-3">
        {row.approved ? (
          <span className="inline-block rounded-full bg-green-100 text-green-800 px-2.5 py-0.5 text-xs font-semibold">
            APPROVED
          </span>
        ) : (
          <span className="inline-block rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-xs font-semibold">
            NOT APPROVED
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-slate-500 text-sm">{formatDate(row.approved_at)}</td>
      <td className="px-4 py-3 text-slate-500 text-sm">{row.owner_name || '—'}</td>
      <td className="px-4 py-3 text-right">
        {row.approved && row.submission_id ? (
          <Link
            to={`/app/reporting/reports/dataset?dataset_id=${row.dataset_id}&period_id=${periodId}`}
            className="text-blue-600 hover:underline text-xs font-medium"
          >
            View Report
          </Link>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )}
      </td>
    </tr>
  );
}

// ─── Key indicator row ────────────────────────────────────────────────────────
function KeyIndicatorRow({ row }) {
  const formatted = formatIndicatorValue(row.value, row.data_type);
  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <p className="font-medium text-slate-800 text-sm">{row.indicator_name}</p>
        <p className="font-mono text-xs text-slate-400">{row.indicator_code}</p>
      </td>
      <td className="px-4 py-3 text-slate-600 text-sm">{row.dataset_name}</td>
      <td className="px-4 py-3">
        <span className="inline-block rounded bg-slate-100 text-slate-600 px-2 py-0.5 text-xs">
          {row.data_type}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        {formatted !== null ? (
          <span className="font-mono font-semibold text-slate-800">{formatted}</span>
        ) : (
          <span className="text-slate-300 italic text-xs">N/A</span>
        )}
      </td>
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ManagerDashboardPage() {
  const [periods, setPeriods] = useState([]);
  const [datasets, setDatasets] = useState([]);

  const [periodId, setPeriodId] = useState('');
  const [datasetId, setDatasetId] = useState('');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load filter options once
  useEffect(() => {
    Promise.all([
      getReportingPeriods({}).catch(() => ({ data: [] })),
      getDatasets({ status: 'ACTIVE' }).catch(() => ({ data: [] })),
    ]).then(([pRes, dRes]) => {
      setPeriods(pRes.data || []);
      setDatasets(dRes.data || []);
    });
  }, []);

  async function load(pid, did) {
    setLoading(true);
    setError('');
    try {
      const res = await getDashboard({
        reportingPeriodId: pid ? Number(pid) : undefined,
        datasetId: did ? Number(did) : undefined,
      });
      setData(res.data);
      // Sync period select to what the server resolved
      if (!pid && res.data?.period) {
        setPeriodId(String(res.data.period.id));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }

  // Initial load (no filters — backend picks latest period)
  useEffect(() => { load('', ''); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleApply(e) {
    e?.preventDefault();
    load(periodId, datasetId);
  }

  return (
    <div>
      <PageHeader
        title="Health Dashboard"
        subtitle="Approved health-service data overview."
      />

      {/* Filters */}
      <FilterBar>
        <FilterGroup label="Reporting Period">
          <select value={periodId} onChange={e => setPeriodId(e.target.value)} className={selectClass}>
            <option value="">Latest period</option>
            {periods.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </FilterGroup>
        <FilterGroup label="Dataset">
          <select value={datasetId} onChange={e => setDatasetId(e.target.value)} className={selectClass}>
            <option value="">All datasets</option>
            {datasets.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </FilterGroup>
        <div className="flex items-end">
          <button
            onClick={handleApply}
            className="rounded-lg bg-blue-600 text-white px-5 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Apply
          </button>
        </div>
      </FilterBar>

      {loading && <LoadingState message="Loading dashboard…" />}
      {error && <ErrorState message={error} onRetry={() => load(periodId, datasetId)} />}

      {!loading && !error && data && (
        <div className="space-y-5">
          {/* Period notice */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Showing data for</span>
            <span className="font-semibold text-slate-700">{data.period.label}</span>
            <span className="text-slate-300">·</span>
            <span>{data.period.period_type}</span>
            {data.dataset && (
              <>
                <span className="text-slate-300">·</span>
                <span className="font-medium text-blue-700">{data.dataset.name}</span>
              </>
            )}
            <span className="ml-auto text-xs text-green-600 font-medium">APPROVED data only</span>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Active Datasets"
              value={data.coverage.totalActive}
              accent="border-slate-400"
            />
            <StatCard
              label="Approved"
              value={data.coverage.approved}
              sub="datasets this period"
              accent="border-green-400"
            />
            <StatCard
              label="Reporting Coverage"
              value={data.coverage.coverage !== null ? `${data.coverage.coverage}%` : 'N/A'}
              sub={data.coverage.totalActive > 0
                ? `${data.coverage.approved} / ${data.coverage.totalActive} datasets`
                : 'No active datasets'}
              accent={data.coverage.coverage === null ? 'border-slate-300'
                : data.coverage.coverage >= 80 ? 'border-green-400'
                : data.coverage.coverage >= 50 ? 'border-amber-400'
                : 'border-red-400'}
            />
            <StatCard
              label="Indicator Values"
              value={data.keyIndicators.length}
              sub="approved values this period"
              accent="border-blue-400"
            />
          </div>

          {/* Coverage bar */}
          <ReportCard>
            <ReportCardHeader title="Reporting Coverage" meta={data.period.label} />
            <div className="px-6 py-5">
              <CoverageBar coverage={data.coverage} />
            </div>
          </ReportCard>

          {/* Dataset status */}
          <ReportCard>
            <ReportCardHeader
              title="Dataset Status"
              meta={`${data.datasetStatus.length} active datasets — ${data.period.label}`}
            />
            {data.datasetStatus.length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-400 text-sm">
                No active datasets found.
              </div>
            ) : (
              <ReportTable>
                <TableHead cols={[
                  { label: 'Dataset' },
                  { label: 'Approval Status' },
                  { label: 'Approved Date' },
                  { label: 'Submitted By' },
                  { label: 'Action', right: true },
                ]} />
                <tbody>
                  {data.datasetStatus.map(row => (
                    <DatasetStatusRow key={row.dataset_id} row={row} periodId={data.period.id} />
                  ))}
                </tbody>
              </ReportTable>
            )}
          </ReportCard>

          {/* Key indicators */}
          <ReportCard>
            <ReportCardHeader
              title="Approved Indicator Values"
              meta={`${data.period.label} · APPROVED submissions only`}
            />
            {data.keyIndicators.length === 0 ? (
              <EmptyState
               
                title="No approved indicator data"
                message="No approved submissions with indicator values exist for this period."
              />
            ) : (
              <ReportTable>
                <TableHead cols={[
                  { label: 'Indicator' },
                  { label: 'Dataset' },
                  { label: 'Type' },
                  { label: 'Value', right: true },
                ]} />
                <tbody>
                  {data.keyIndicators.map((row, i) => (
                    <KeyIndicatorRow key={`${row.indicator_id}-${i}`} row={row} />
                  ))}
                </tbody>
              </ReportTable>
            )}
          </ReportCard>

          {/* Navigation to analysis */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 px-6 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-700">Deep Dive Analysis</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Compare indicator trends across reporting periods.
              </p>
            </div>
            <Link
              to="/app/manager/analysis"
              className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Indicator Analysis →
            </Link>
          </div>
        </div>
      )}

      {!loading && !error && !data && (
        <EmptyState
         
          title="No data available"
          message="No reporting period data found. Ensure periods and approved submissions exist."
        />
      )}
    </div>
  );
}

