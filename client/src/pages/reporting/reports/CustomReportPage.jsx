import { useEffect, useRef, useState } from 'react';
import { getDatasets } from '../../../api/datasetApi';
import { getIndicators } from '../../../api/indicatorApi';
import { getReportingPeriods } from '../../../api/reportingPeriodApi';
import {
  previewCustomReport,
  exportCustomReportPdf,
  exportCustomReportExcel,
  downloadBlob,
} from '../../../api/customReportApi';
import {
  PageHeader, ReportCard, ReportCardHeader, LoadingState, EmptyState, ErrorState,
} from '../../../components/reports';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dt) {
  if (!dt) return '';
  return new Date(dt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Checkbox row component
function CheckRow({ id, label, sub, checked, onChange }) {
  return (
    <label className="flex items-start gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(id, e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-400"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 leading-tight">{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </label>
  );
}

// Section header with Select All / Clear All
function SectionHeader({ title, count, total, onSelectAll, onClearAll, disabled }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <div>
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        {total > 0 && (
          <p className="text-xs text-slate-400">
            {count} of {total} selected
          </p>
        )}
      </div>
      {total > 0 && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={disabled || count === total}
            className="text-xs text-blue-600 hover:underline disabled:opacity-40 disabled:no-underline"
          >
            Select All
          </button>
          <span className="text-slate-300 text-xs">·</span>
          <button
            type="button"
            onClick={onClearAll}
            disabled={disabled || count === 0}
            className="text-xs text-slate-500 hover:underline disabled:opacity-40 disabled:no-underline"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

// Selection summary pill
function SelectionPill({ label, count, colour = 'bg-blue-50 text-blue-700 border-blue-200' }) {
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${colour}`}>
      <span className="font-bold text-sm">{count}</span>
      <span>{label}</span>
    </div>
  );
}

// ─── Matrix preview table ─────────────────────────────────────────────────────

function MatrixTable({ indicators, periods, matrix }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse" style={{ minWidth: `${Math.max(600, 200 + periods.length * 120)}px` }}>
        <thead>
          <tr className="bg-blue-700">
            <th className="sticky left-0 z-10 bg-blue-700 text-left px-4 py-3 text-xs font-semibold text-white uppercase tracking-wide min-w-[200px]">
              Indicator
            </th>
            {periods.map(p => (
              <th
                key={p.id}
                className="px-3 py-3 text-right text-xs font-semibold text-white uppercase tracking-wide min-w-[110px]"
              >
                {p.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {indicators.map((ind, rowIdx) => (
            <tr
              key={ind.id}
              className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
            >
              <td className="sticky left-0 z-10 px-4 py-3 border-b border-slate-100 bg-inherit">
                <p className="font-medium text-slate-800 text-sm leading-tight">{ind.name}</p>
                <p className="font-mono text-xs text-slate-400 mt-0.5">{ind.code}</p>
              </td>
              {periods.map(period => {
                const val = matrix[ind.id]?.[period.id];
                const isEmpty = val === null || val === undefined;
                return (
                  <td
                    key={period.id}
                    className="px-3 py-3 text-right border-b border-slate-100"
                  >
                    {isEmpty ? (
                      <span className="text-slate-300 text-xs italic">N/A</span>
                    ) : (
                      <span className="font-mono text-slate-800 font-semibold">{String(val)}</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CustomReportPage() {
  // ── Options state ──────────────────────────────────────────────────────────
  const [datasets, setDatasets]     = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [periods, setPeriods]       = useState([]);
  const [loadingOpts, setLoadingOpts] = useState(true);
  const [loadingIndicators, setLoadingIndicators] = useState(false);

  // ── Selections ─────────────────────────────────────────────────────────────
  const [selectedDatasetId, setSelectedDatasetId]         = useState('');
  const [selectedIndicatorIds, setSelectedIndicatorIds]   = useState(new Set());
  const [selectedPeriodIds, setSelectedPeriodIds]         = useState(new Set());

  // ── Report state ───────────────────────────────────────────────────────────
  const [report, setReport]         = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // ── Export state ───────────────────────────────────────────────────────────
  const [exportingPdf, setExportingPdf]     = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportError, setExportError]       = useState('');

  const previewRef = useRef(null);

  // ── Load datasets + periods once ───────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      getDatasets({ status: 'ACTIVE' }).catch(() => ({ data: [] })),
      getReportingPeriods({}).catch(() => ({ data: [] })),
    ]).then(([dRes, pRes]) => {
      setDatasets(dRes.data || []);
      setPeriods(
        (pRes.data || []).sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
      );
      setLoadingOpts(false);
    });
  }, []);

  // ── Load indicators when dataset changes ───────────────────────────────────
  useEffect(() => {
    setSelectedIndicatorIds(new Set());
    setIndicators([]);
    setReport(null);
    if (!selectedDatasetId) return;
    setLoadingIndicators(true);
    getIndicators({ dataset_id: selectedDatasetId, status: 'ACTIVE' })
      .then(res => setIndicators(res.data || []))
      .catch(() => setIndicators([]))
      .finally(() => setLoadingIndicators(false));
  }, [selectedDatasetId]);

  // ── Selection helpers ──────────────────────────────────────────────────────
  function toggleIndicator(id, checked) {
    setSelectedIndicatorIds(prev => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
    setReport(null);
  }

  function togglePeriod(id, checked) {
    setSelectedPeriodIds(prev => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
    setReport(null);
  }

  // ── Preview ────────────────────────────────────────────────────────────────
  async function handlePreview() {
    setPreviewError('');
    setValidationErrors({});
    setReport(null);

    // Client-side guard (backend also validates)
    if (!selectedDatasetId) {
      setValidationErrors({ dataset_id: 'Please select a dataset.' });
      return;
    }
    if (selectedIndicatorIds.size === 0) {
      setValidationErrors({ indicator_ids: 'Select at least one indicator.' });
      return;
    }
    if (selectedPeriodIds.size === 0) {
      setValidationErrors({ reporting_period_ids: 'Select at least one reporting period.' });
      return;
    }

    setPreviewing(true);
    try {
      const res = await previewCustomReport({
        datasetId: Number(selectedDatasetId),
        indicatorIds: [...selectedIndicatorIds],
        periodIds: [...selectedPeriodIds],
      });
      setReport(res.data);
      setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to generate preview.';
      const errs = err.response?.data?.errors || {};
      setPreviewError(msg);
      setValidationErrors(errs);
    } finally {
      setPreviewing(false);
    }
  }

  // ── Exports ────────────────────────────────────────────────────────────────
  async function handleExportPdf() {
    setExportingPdf(true);
    setExportError('');
    try {
      const blob = await exportCustomReportPdf({
        datasetId: Number(selectedDatasetId),
        indicatorIds: [...selectedIndicatorIds],
        periodIds: [...selectedPeriodIds],
      });
      downloadBlob(blob, `custom-report-${report?.dataset?.code || 'export'}.pdf`);
    } catch (err) {
      setExportError(err.response?.data?.message || 'PDF export failed.');
    } finally {
      setExportingPdf(false);
    }
  }

  async function handleExportExcel() {
    setExportingExcel(true);
    setExportError('');
    try {
      const blob = await exportCustomReportExcel({
        datasetId: Number(selectedDatasetId),
        indicatorIds: [...selectedIndicatorIds],
        periodIds: [...selectedPeriodIds],
      });
      downloadBlob(blob, `custom-report-${report?.dataset?.code || 'export'}.xlsx`);
    } catch (err) {
      setExportError(err.response?.data?.message || 'Excel export failed.');
    } finally {
      setExportingExcel(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const canPreview = selectedDatasetId && selectedIndicatorIds.size > 0 && selectedPeriodIds.size > 0;
  const selectedDataset = datasets.find(d => String(d.id) === String(selectedDatasetId));

  if (loadingOpts) return <LoadingState message="Loading datasets and periods…" />;

  return (
    <>
      {/* Print styles — injected inline so they apply globally during window.print() */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #custom-report-print-area { display: block !important; }
          #custom-report-print-area * { visibility: visible !important; }
          .no-print { display: none !important; }
          @page { margin: 15mm; }
        }
        @media screen {
          #custom-report-print-area { display: contents; }
        }
      `}</style>

      <div className="no-print">
        <PageHeader
          title="Custom Report"
          subtitle="Build a report from approved health data by selecting indicators and periods."
        />
      </div>

      <div className="flex flex-col xl:flex-row gap-5">
        {/* ── Builder panel ────────────────────────────────────────────────── */}
        <div className="xl:w-80 shrink-0 space-y-4 no-print">

          {/* Dataset */}
          <ReportCard>
            <ReportCardHeader title="1 — Dataset" />
            <div className="px-4 py-3">
              <label className="text-xs text-slate-500 font-medium uppercase tracking-wide block mb-1">
                Active Dataset
              </label>
              <select
                value={selectedDatasetId}
                onChange={e => setSelectedDatasetId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">— Select dataset —</option>
                {datasets.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {validationErrors.dataset_id && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.dataset_id}</p>
              )}
            </div>
          </ReportCard>

          {/* Indicators */}
          <ReportCard>
            <ReportCardHeader title="2 — Indicators" />
            <div className="px-4 py-3">
              {!selectedDatasetId ? (
                <p className="text-xs text-slate-400 italic py-2">
                  Select a dataset to choose its indicators.
                </p>
              ) : loadingIndicators ? (
                <p className="text-xs text-slate-400 py-2">Loading indicators…</p>
              ) : indicators.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No active indicators for this dataset.</p>
              ) : (
                <>
                  <SectionHeader
                    title="Select indicators"
                    count={selectedIndicatorIds.size}
                    total={indicators.length}
                    onSelectAll={() => setSelectedIndicatorIds(new Set(indicators.map(i => i.id)))}
                    onClearAll={() => setSelectedIndicatorIds(new Set())}
                  />
                  <div className="max-h-56 overflow-y-auto space-y-0.5">
                    {indicators.map(ind => (
                      <CheckRow
                        key={ind.id}
                        id={ind.id}
                        label={ind.name}
                        sub={`${ind.code} · ${ind.data_type}`}
                        checked={selectedIndicatorIds.has(ind.id)}
                        onChange={toggleIndicator}
                      />
                    ))}
                  </div>
                </>
              )}
              {validationErrors.indicator_ids && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.indicator_ids}</p>
              )}
            </div>
          </ReportCard>

          {/* Periods */}
          <ReportCard>
            <ReportCardHeader title="3 — Reporting Periods" />
            <div className="px-4 py-3">
              <SectionHeader
                title="Select periods"
                count={selectedPeriodIds.size}
                total={periods.length}
                onSelectAll={() => setSelectedPeriodIds(new Set(periods.map(p => p.id)))}
                onClearAll={() => setSelectedPeriodIds(new Set())}
              />
              <div className="max-h-64 overflow-y-auto space-y-0.5">
                {periods.map(p => (
                  <CheckRow
                    key={p.id}
                    id={p.id}
                    label={p.label}
                    sub={`${formatDate(p.start_date)} – ${formatDate(p.end_date)}`}
                    checked={selectedPeriodIds.has(p.id)}
                    onChange={togglePeriod}
                  />
                ))}
              </div>
              {validationErrors.reporting_period_ids && (
                <p className="text-red-500 text-xs mt-1">{validationErrors.reporting_period_ids}</p>
              )}
            </div>
          </ReportCard>

          {/* Selection summary + Preview button */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 px-4 py-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Selection Summary
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <SelectionPill
                label={selectedDataset ? selectedDataset.name : 'No dataset'}
                count={selectedDataset ? '✓' : '—'}
                colour={selectedDataset ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'}
              />
              <SelectionPill
                label="indicators"
                count={selectedIndicatorIds.size}
                colour={selectedIndicatorIds.size > 0 ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-500 border-slate-200'}
              />
              <SelectionPill
                label="periods"
                count={selectedPeriodIds.size}
                colour={selectedPeriodIds.size > 0 ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-slate-100 text-slate-500 border-slate-200'}
              />
            </div>

            <button
              onClick={handlePreview}
              disabled={!canPreview || previewing}
              className="w-full rounded-lg bg-blue-600 text-white py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {previewing ? 'Generating Preview…' : 'Preview Report'}
            </button>

            {previewError && (
              <p className="text-red-600 text-xs mt-2">{previewError}</p>
            )}
          </div>
        </div>

        {/* ── Report preview panel ──────────────────────────────────────────── */}
        <div className="flex-1 min-w-0" ref={previewRef} id="custom-report-print-area">
          {previewing && <LoadingState message="Building custom report…" />}

          {!previewing && !report && !previewError && (
            <EmptyState
             
              title="Build your report"
              message="Select a dataset, choose indicators and periods, then click Preview Report to see the results."
            />
          )}

          {!previewing && report && (
            <div className="space-y-4">
              {/* Export actions */}
              <div className="flex flex-wrap items-center gap-3 no-print">
                <span className="text-xs text-slate-500 font-medium">Export:</span>
                <button
                  onClick={handleExportPdf}
                  disabled={exportingPdf || exportingExcel}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 text-red-700 px-3 py-1.5 text-xs font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  {exportingPdf ? 'Preparing PDF…' : '↓ PDF'}
                </button>
                <button
                  onClick={handleExportExcel}
                  disabled={exportingPdf || exportingExcel}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 text-green-700 px-3 py-1.5 text-xs font-medium hover:bg-green-100 disabled:opacity-50 transition-colors"
                >
                  {exportingExcel ? 'Preparing Excel…' : '↓ Excel'}
                </button>
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 transition-colors"
                >
                  Print
                </button>
                {exportError && (
                  <span className="text-red-600 text-xs">{exportError}</span>
                )}
              </div>

              {/* Report header card */}
              <ReportCard>
                <div className="px-6 py-5 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Custom Report</p>
                      <h2 className="text-xl font-bold text-slate-800 mt-1">{report.dataset.name}</h2>
                      <p className="font-mono text-xs text-slate-400 mt-0.5">{report.dataset.code}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-400">Generated</p>
                      <p className="text-sm text-slate-600 font-medium">
                        {new Date(report.generatedAt).toLocaleString(undefined, {
                          dateStyle: 'medium', timeStyle: 'short',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="text-xs text-slate-500 font-medium self-center">Periods:</span>
                    {report.periods.map(p => (
                      <span key={p.id} className="inline-block rounded-full bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-0.5 text-xs font-medium">
                        {p.label}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex gap-4 text-xs text-slate-500">
                    <span>{report.indicators.length} indicators</span>
                    <span>·</span>
                    <span>{report.periods.length} periods</span>
                    <span>·</span>
                    <span className="text-green-600 font-medium">APPROVED data only</span>
                  </div>
                </div>
              </ReportCard>

              {/* Matrix table */}
              <ReportCard>
                <ReportCardHeader
                  title="Indicator Results"
                  meta={`${report.dataset.name} — ${report.periods.map(p => p.label).join(', ')}`}
                />
                {report.indicators.length === 0 ? (
                  <div className="px-6 py-8 text-center text-slate-400 text-sm">No indicators to display.</div>
                ) : (
                  <>
                    <MatrixTable
                      indicators={report.indicators}
                      periods={report.periods}
                      matrix={report.matrix}
                    />
                    <div className="px-4 py-2 border-t border-slate-100">
                      <p className="text-xs text-slate-400 italic">
                        N/A — No approved submission for this indicator and period.
                        Values are never substituted with zero.
                      </p>
                    </div>
                  </>
                )}
              </ReportCard>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

