import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { getIndicatorTrend, getIndicatorComparison } from '../../api/analyticsApi';
import { getDatasets } from '../../api/datasetApi';
import { getIndicators } from '../../api/indicatorApi';
import { getReportingPeriods } from '../../api/reportingPeriodApi';
import {
  PageHeader, FilterBar, FilterGroup, selectClass,
  ReportCard, ReportCardHeader, StatusBadge,
  ReportTable, TableHead, LoadingState, EmptyState, ErrorState,
  formatIndicatorValue,
} from '../../components/reports';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NUMERIC_TYPES = ['numeric', 'decimal', 'percentage'];

function isChartable(dataType) {
  return NUMERIC_TYPES.includes(dataType);
}

function parseNumeric(v) {
  if (v === null || v === undefined) return null;
  const n = Number(String(v).replace('%', '').trim());
  return isNaN(n) ? null : n;
}

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

// ─── Trend Chart ──────────────────────────────────────────────────────────────

function TrendChart({ values, indicator }) {
  const chartData = values.map(v => ({
    label: v.period_label,
    value: parseNumeric(v.value),
    rawValue: v.value,
  }));

  const hasAnyData = chartData.some(d => d.value !== null);

  if (!hasAnyData) {
    return (
      <div className="py-8 text-center text-slate-400 text-sm italic">
        No approved numeric values available to chart for this selection.
      </div>
    );
  }

  const unit = indicator.data_type === 'percentage' ? '%' : '';

  // Custom tooltip
  function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    const val = payload[0]?.value;
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
        <p className="font-semibold text-slate-700">{label}</p>
        <p className="text-blue-600 font-bold mt-0.5">
          {val !== null && val !== undefined ? `${val}${unit}` : 'N/A'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v}${unit}`}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2563eb"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
            activeDot={{ r: 6 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-400 mt-1 text-center italic">
        Gaps indicate periods with no approved submission. Values are never substituted.
      </p>
    </div>
  );
}

// ─── Trend data table (accessible alternative) ───────────────────────────────

function TrendTable({ values, indicator }) {
  return (
    <ReportTable>
      <TableHead cols={[
        { label: 'Period' },
        { label: 'Start Date' },
        { label: 'Value', right: true },
      ]} />
      <tbody>
        {values.map(v => (
          <tr key={v.period_id} className="border-t border-slate-100 hover:bg-slate-50">
            <td className="px-4 py-2.5 text-sm text-slate-700">{v.period_label}</td>
            <td className="px-4 py-2.5 text-sm text-slate-500">{formatDate(v.start_date)}</td>
            <td className="px-4 py-2.5 text-right">
              {v.value !== null ? (
                <span className="font-mono font-semibold text-slate-800">
                  {formatIndicatorValue(v.value, indicator.data_type)}
                </span>
              ) : (
                <span className="text-slate-300 text-xs italic">N/A</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </ReportTable>
  );
}

// ─── Comparison card ──────────────────────────────────────────────────────────

function ComparisonCard({ comparison }) {
  const { periodA, periodB, difference, differenceLabel, isNumericComparison, indicator } = comparison;

  const valA = periodA.value !== null
    ? formatIndicatorValue(periodA.value, indicator.data_type) : null;
  const valB = periodB.value !== null
    ? formatIndicatorValue(periodB.value, indicator.data_type) : null;

  const diffColour = difference === null ? 'text-slate-400'
    : difference > 0 ? 'text-green-600'
    : difference < 0 ? 'text-red-500'
    : 'text-slate-500';

  return (
    <div className="grid grid-cols-3 gap-4 px-6 py-5">
      {/* Period A */}
      <div className="text-center">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
          {periodA.label}
        </p>
        {valA !== null ? (
          <p className="text-3xl font-bold text-slate-800">{valA}</p>
        ) : (
          <p className="text-xl text-slate-300 italic">N/A</p>
        )}
        <p className="text-xs text-slate-400 mt-1">{formatDate(periodA.start_date)}</p>
      </div>

      {/* Arrow + difference */}
      <div className="text-center flex flex-col items-center justify-center">
        <p className="text-2xl text-slate-200 mb-2">→</p>
        {isNumericComparison && valA !== null && valB !== null ? (
          <>
            <p className={`text-xl font-bold ${diffColour}`}>
              {differenceLabel}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {indicator.data_type === 'percentage' ? 'percentage points' : 'difference'}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-300 italic">
            {valA === null || valB === null ? 'N/A' : 'non-numeric'}
          </p>
        )}
      </div>

      {/* Period B */}
      <div className="text-center">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
          {periodB.label}
        </p>
        {valB !== null ? (
          <p className="text-3xl font-bold text-slate-800">{valB}</p>
        ) : (
          <p className="text-xl text-slate-300 italic">N/A</p>
        )}
        <p className="text-xs text-slate-400 mt-1">{formatDate(periodB.start_date)}</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function IndicatorAnalysisPage() {
  const [datasets, setDatasets]     = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [periods, setPeriods]       = useState([]);
  const [loadingInds, setLoadingInds] = useState(false);

  // Trend filters
  const [tDatasetId, setTDatasetId]     = useState('');
  const [tIndicatorId, setTIndicatorId] = useState('');
  const [tStartId, setTStartId]         = useState('');
  const [tEndId, setTEndId]             = useState('');

  // Comparison filters — share the same dataset/indicator
  const [cPeriodAId, setCPeriodAId] = useState('');
  const [cPeriodBId, setCPeriodBId] = useState('');

  // Results
  const [trendData, setTrendData]     = useState(null);
  const [compData, setCompData]       = useState(null);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [loadingComp, setLoadingComp]   = useState(false);
  const [trendError, setTrendError]   = useState('');
  const [compError, setCompError]     = useState('');

  const [showTable, setShowTable] = useState(false); // toggle chart↔table

  // Load base options
  useEffect(() => {
    Promise.all([
      getDatasets({ status: 'ACTIVE' }).catch(() => ({ data: [] })),
      getReportingPeriods({}).catch(() => ({ data: [] })),
    ]).then(([dRes, pRes]) => {
      setDatasets(dRes.data || []);
      const sorted = (pRes.data || []).sort(
        (a, b) => new Date(a.start_date) - new Date(b.start_date)
      );
      setPeriods(sorted);
    });
  }, []);

  // Reload indicators when dataset changes
  useEffect(() => {
    setTIndicatorId('');
    setIndicators([]);
    if (!tDatasetId) return;
    setLoadingInds(true);
    getIndicators({ dataset_id: tDatasetId, status: 'ACTIVE' })
      .then(res => setIndicators(res.data || []))
      .catch(() => setIndicators([]))
      .finally(() => setLoadingInds(false));
  }, [tDatasetId]);

  // Reset results when selections change
  useEffect(() => { setTrendData(null); }, [tDatasetId, tIndicatorId, tStartId, tEndId]);
  useEffect(() => { setCompData(null); }, [tDatasetId, tIndicatorId, cPeriodAId, cPeriodBId]);

  async function handleTrend(e) {
    e.preventDefault();
    setTrendError('');
    setTrendData(null);
    setLoadingTrend(true);
    try {
      const res = await getIndicatorTrend({
        datasetId: Number(tDatasetId),
        indicatorId: Number(tIndicatorId),
        startPeriodId: Number(tStartId),
        endPeriodId: Number(tEndId),
      });
      setTrendData(res.data);
    } catch (err) {
      setTrendError(err.response?.data?.message || 'Failed to load trend data.');
    } finally {
      setLoadingTrend(false);
    }
  }

  async function handleComparison(e) {
    e.preventDefault();
    setCompError('');
    setCompData(null);
    setLoadingComp(true);
    try {
      const res = await getIndicatorComparison({
        datasetId: Number(tDatasetId),
        indicatorId: Number(tIndicatorId),
        periodAId: Number(cPeriodAId),
        periodBId: Number(cPeriodBId),
      });
      setCompData(res.data);
    } catch (err) {
      setCompError(err.response?.data?.message || 'Failed to load comparison.');
    } finally {
      setLoadingComp(false);
    }
  }

  const selectedIndicator = indicators.find(i => String(i.id) === String(tIndicatorId));
  const canRunTrend = tDatasetId && tIndicatorId && tStartId && tEndId;
  const canRunComp  = tDatasetId && tIndicatorId && cPeriodAId && cPeriodBId;

  return (
    <div>
      <PageHeader
        title="Indicator Analysis"
        subtitle="Examine approved indicator trends and compare values across reporting periods."
      />

      {/* Selector panel */}
      <ReportCard className="mb-5">
        <ReportCardHeader title="Selection" meta="Choose a dataset and indicator" />
        <div className="px-4 py-4">
          <div className="flex flex-wrap gap-4">
            <FilterGroup label="Dataset">
              <select value={tDatasetId} onChange={e => setTDatasetId(e.target.value)} className={selectClass}>
                <option value="">— Select dataset —</option>
                {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </FilterGroup>
            <FilterGroup label="Indicator">
              <select
                value={tIndicatorId}
                onChange={e => setTIndicatorId(e.target.value)}
                disabled={!tDatasetId || loadingInds}
                className={selectClass}
              >
                <option value="">{loadingInds ? 'Loading…' : '— Select indicator —'}</option>
                {indicators.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </FilterGroup>
          </div>

          {selectedIndicator && (
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
              <span>Code: <span className="font-mono text-slate-700">{selectedIndicator.code}</span></span>
              <span>·</span>
              <span>Type: <span className="inline-block rounded bg-slate-100 text-slate-600 px-1.5 py-0.5">{selectedIndicator.data_type}</span></span>
              <span>·</span>
              <span>{selectedIndicator.required ? 'Required' : 'Optional'}</span>
              {!isChartable(selectedIndicator.data_type) && (
                <span className="text-amber-600">· Chart not available for this type — table view only</span>
              )}
            </div>
          )}
        </div>
      </ReportCard>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* ── Trend panel ───────────────────────────────────────────────── */}
        <div className="space-y-4">
          <ReportCard>
            <ReportCardHeader title="Multi-Period Trend" />
            <div className="px-4 py-4">
              <div className="flex flex-wrap gap-3 mb-3">
                <FilterGroup label="Start Period">
                  <select value={tStartId} onChange={e => setTStartId(e.target.value)} className={`${selectClass} min-w-[160px]`}>
                    <option value="">— From —</option>
                    {periods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </FilterGroup>
                <FilterGroup label="End Period">
                  <select value={tEndId} onChange={e => setTEndId(e.target.value)} className={`${selectClass} min-w-[160px]`}>
                    <option value="">— To —</option>
                    {periods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </FilterGroup>
              </div>
              <button
                onClick={handleTrend}
                disabled={!canRunTrend || loadingTrend}
                className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loadingTrend ? 'Loading…' : 'View Trend'}
              </button>
            </div>
          </ReportCard>

          {loadingTrend && <LoadingState message="Loading trend data…" />}
          {trendError && <ErrorState message={trendError} onRetry={handleTrend} />}

          {!loadingTrend && trendData && (
            <ReportCard>
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-800">{trendData.indicator.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{trendData.dataset.name} · {trendData.values.length} periods</p>
                </div>
                {isChartable(trendData.indicator.data_type) && (
                  <button
                    onClick={() => setShowTable(v => !v)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {showTable ? 'Show Chart' : 'Show Table'}
                  </button>
                )}
              </div>

              <div className="px-4 py-4">
                {trendData.values.length === 0 ? (
                  <EmptyState title="No periods in range" message="No reporting periods found between the selected dates." />
                ) : isChartable(trendData.indicator.data_type) && !showTable ? (
                  <TrendChart values={trendData.values} indicator={trendData.indicator} />
                ) : (
                  <TrendTable values={trendData.values} indicator={trendData.indicator} />
                )}
              </div>
            </ReportCard>
          )}
        </div>

        {/* ── Comparison panel ──────────────────────────────────────────── */}
        <div className="space-y-4">
          <ReportCard>
            <ReportCardHeader title="Period Comparison" />
            <div className="px-4 py-4">
              <div className="flex flex-wrap gap-3 mb-3">
                <FilterGroup label="Period A">
                  <select value={cPeriodAId} onChange={e => setCPeriodAId(e.target.value)} className={`${selectClass} min-w-[160px]`}>
                    <option value="">— Period A —</option>
                    {periods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </FilterGroup>
                <FilterGroup label="Period B">
                  <select value={cPeriodBId} onChange={e => setCPeriodBId(e.target.value)} className={`${selectClass} min-w-[160px]`}>
                    <option value="">— Period B —</option>
                    {periods.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </FilterGroup>
              </div>
              <button
                onClick={handleComparison}
                disabled={!canRunComp || loadingComp}
                className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loadingComp ? 'Loading…' : 'Compare'}
              </button>
            </div>
          </ReportCard>

          {loadingComp && <LoadingState message="Comparing periods…" />}
          {compError && <ErrorState message={compError} onRetry={handleComparison} />}

          {!loadingComp && compData && (
            <ReportCard>
              <ReportCardHeader
                title={compData.indicator.name}
                meta={`${compData.dataset.name} · Period comparison`}
              />
              <ComparisonCard comparison={compData} />

              {/* Accessible data table for comparison */}
              <div className="border-t border-slate-100 px-4 py-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 font-semibold uppercase">
                      <th className="text-left py-1">Period</th>
                      <th className="text-right py-1">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-slate-100">
                      <td className="py-1.5 text-slate-700">{compData.periodA.label}</td>
                      <td className="py-1.5 text-right font-mono font-semibold text-slate-800">
                        {compData.periodA.value !== null
                          ? formatIndicatorValue(compData.periodA.value, compData.indicator.data_type)
                          : <span className="text-slate-300 italic text-xs">N/A</span>}
                      </td>
                    </tr>
                    <tr className="border-t border-slate-100">
                      <td className="py-1.5 text-slate-700">{compData.periodB.label}</td>
                      <td className="py-1.5 text-right font-mono font-semibold text-slate-800">
                        {compData.periodB.value !== null
                          ? formatIndicatorValue(compData.periodB.value, compData.indicator.data_type)
                          : <span className="text-slate-300 italic text-xs">N/A</span>}
                      </td>
                    </tr>
                    {compData.differenceLabel && (
                      <tr className="border-t border-slate-100">
                        <td className="py-1.5 text-slate-500 italic">Difference</td>
                        <td className={`py-1.5 text-right font-semibold ${
                          compData.difference > 0 ? 'text-green-600'
                          : compData.difference < 0 ? 'text-red-500'
                          : 'text-slate-500'
                        }`}>
                          {compData.differenceLabel}
                          {compData.indicator.data_type === 'percentage' && (
                            <span className="text-xs font-normal text-slate-400 ml-1">pp</span>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </ReportCard>
          )}
        </div>
      </div>
    </div>
  );
}

