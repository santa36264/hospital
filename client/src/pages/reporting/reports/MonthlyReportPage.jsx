import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getReportingPeriods } from '../../../api/reportingPeriodApi';
import { getMonthlyReport } from '../../../api/reportApi';
import {
  PageHeader, StatCard, FilterBar, FilterGroup, selectClass,
  ReportCard, ReportCardHeader, StatusBadge,
  ReportTable, TableHead, LoadingState, EmptyState, ErrorState,
} from '../../../components/reports';

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function ApprovalBadge({ row }) {
  if (row.approvedSubmission) {
    return (
      <span className="inline-block rounded-full bg-green-100 text-green-800 px-2.5 py-0.5 text-xs font-semibold">
        APPROVED
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-xs font-semibold">
      NOT APPROVED
    </span>
  );
}

export default function MonthlyReportPage() {
  const [periods, setPeriods] = useState([]);
  const [periodId, setPeriodId] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState(false);

  useEffect(() => {
    getReportingPeriods({}).catch(() => ({ data: [] })).then(res => setPeriods(res.data || []));
  }, []);

  async function handleGenerate(e) {
    e?.preventDefault();
    if (!periodId) return;
    setLoading(true);
    setError('');
    setReport(null);
    setGenerated(true);
    try {
      const res = await getMonthlyReport({ reportingPeriodId: Number(periodId) });
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
        title="Monthly Report"
        subtitle="Overview of approved dataset submissions for a reporting period."
      />

      <FilterBar>
        <FilterGroup label="Reporting Period">
          <select value={periodId} onChange={e => setPeriodId(e.target.value)} className={selectClass}>
            <option value="">— Select period —</option>
            {periods.map(p => <option key={p.id} value={p.id}>{p.label} ({p.period_type})</option>)}
          </select>
        </FilterGroup>
        <div className="flex items-end">
          <button
            onClick={handleGenerate}
            disabled={!periodId || loading}
            className="rounded-lg bg-blue-600 text-white px-5 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Generating…' : 'View Report'}
          </button>
        </div>
      </FilterBar>

      {loading && <LoadingState message="Generating monthly report…" />}
      {error && <ErrorState message={error} onRetry={handleGenerate} />}

      {!loading && !error && !generated && (
        <EmptyState
         
          title="Select a reporting period"
          message="Choose a reporting period to see which datasets have approved submissions."
        />
      )}

      {!loading && !error && report && (
        <div className="space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard label="Period" value={report.period.label} sub={report.period.period_type} accent="border-blue-400" />
            <StatCard label="Approved" value={report.summary.approved} sub="datasets with approved data" accent="border-green-400" />
            <StatCard label="Not Approved" value={report.summary.notApproved} sub="datasets pending or missing" accent="border-amber-400" />
          </div>

          {/* Dataset table */}
          <ReportCard>
            <ReportCardHeader
              title={`Dataset Approval Status — ${report.period.label}`}
              meta={`${report.summary.totalDatasets} active datasets`}
            />
            {report.rows.length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-400 text-sm">No active datasets found.</div>
            ) : (
              <ReportTable>
                <TableHead cols={[
                  { label: 'Dataset' },
                  { label: 'Code' },
                  { label: 'Approval Status' },
                  { label: 'Submitted By' },
                  { label: 'Approved Date' },
                  { label: 'Action', right: true },
                ]} />
                <tbody>
                  {report.rows.map(({ dataset, approvedSubmission }) => (
                    <tr key={dataset.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{dataset.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{dataset.code}</td>
                      <td className="px-4 py-3">
                        <ApprovalBadge row={{ approvedSubmission }} />
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-sm">
                        {approvedSubmission ? approvedSubmission.owner_name : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-sm">
                        {approvedSubmission ? formatDate(approvedSubmission.approved_at) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {approvedSubmission ? (
                          <Link
                            to={`/app/reporting/reports/dataset?dataset_id=${dataset.id}&period_id=${periodId}`}
                            className="text-blue-600 hover:underline text-xs font-medium"
                          >
                            View Report
                          </Link>
                        ) : (
                          <span className="text-slate-300 text-xs">Not available</span>
                        )}
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

