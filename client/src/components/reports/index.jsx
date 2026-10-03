/**
 * Shared report UI components — Stage 08.
 * Import from this barrel file: import { PageHeader, StatCard, ... } from '../../components/reports';
 */

// ─── Page Header ──────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 leading-tight">{title}</h2>
        {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

// ─── Stat / Summary Card ──────────────────────────────────────────────────────
export function StatCard({ label, value, accent = 'border-slate-300', sub }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border-l-4 ${accent} px-5 py-4`}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-slate-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Report Filter Bar ────────────────────────────────────────────────────────
export function FilterBar({ children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 px-4 py-3 mb-5">
      <div className="flex flex-wrap items-end gap-3">{children}</div>
    </div>
  );
}

export function FilterGroup({ label, children }) {
  return (
    <div className="flex flex-col gap-1 min-w-[160px]">
      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

export const selectClass =
  'rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 min-w-[180px]';

export const inputClass =
  'rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400';

// ─── Report Card ──────────────────────────────────────────────────────────────
export function ReportCard({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-100 ${className}`}>
      {children}
    </div>
  );
}

export function ReportCardHeader({ title, badge, meta }) {
  return (
    <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-3 flex-wrap">
      <div>
        <h3 className="text-base font-semibold text-slate-800">{title}</h3>
        {meta && <p className="text-xs text-slate-500 mt-0.5">{meta}</p>}
      </div>
      {badge && <div className="shrink-0">{badge}</div>}
    </div>
  );
}

// ─── Status Badge (report-aware) ──────────────────────────────────────────────
const STATUS_STYLES = {
  DRAFT:        'bg-amber-100 text-amber-800',
  SUBMITTED:    'bg-blue-100 text-blue-800',
  UNDER_REVIEW: 'bg-purple-100 text-purple-800',
  RETURNED:     'bg-red-100 text-red-800',
  APPROVED:     'bg-green-100 text-green-800',
  ACTIVE:       'bg-green-100 text-green-800',
  INACTIVE:     'bg-slate-200 text-slate-600',
  OPEN:         'bg-green-100 text-green-800',
  CLOSED:       'bg-slate-200 text-slate-600',
};

export function StatusBadge({ status }) {
  const cls = STATUS_STYLES[status] || 'bg-slate-100 text-slate-700';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {status?.replace(/_/g, ' ')}
    </span>
  );
}

// ─── Value display by indicator type ─────────────────────────────────────────
export function formatIndicatorValue(value, dataType) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  if (dataType === 'percentage') return `${value}%`;
  if (dataType === 'yes/no') {
    const v = String(value).toLowerCase();
    return v === 'yes' || v === 'true' || v === '1' ? 'Yes' : 'No';
  }
  return String(value);
}

// ─── Table primitives ─────────────────────────────────────────────────────────
export function ReportTable({ children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function TableHead({ cols }) {
  return (
    <thead className="bg-slate-50 border-b border-slate-200">
      <tr>
        {cols.map((col, i) => (
          <th
            key={i}
            className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide ${
              col.right ? 'text-right' : 'text-left'
            }`}
          >
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// ─── Loading / Empty / Error states ──────────────────────────────────────────
export function LoadingState({ message = 'Loading report…' }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
      <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4" />
      <p className="text-slate-500 text-sm">{message}</p>
    </div>
  );
}

export function EmptyState({ icon, title, message, action }) {
  const defaultIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4" />
    </svg>
  );
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-12 text-center">
      <div className="flex justify-center mb-3">{icon || defaultIcon}</div>
      <p className="font-semibold text-slate-700 mb-1">{title}</p>
      {message && <p className="text-slate-400 text-sm max-w-sm mx-auto">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-red-100 p-8 text-center">
      <div className="flex justify-center mb-3"><svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg></div>
      <p className="text-red-700 font-medium mb-1">Failed to load report</p>
      <p className="text-slate-500 text-sm mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

// ─── No Approved Data notice ──────────────────────────────────────────────────
export function NoApprovedData({ datasetName, periodLabel }) {
  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 text-sm">
      <p className="font-semibold text-amber-800 mb-1">No approved data available</p>
      <p className="text-amber-700">
        {datasetName && periodLabel
          ? `${datasetName} for ${periodLabel} has not been approved yet.`
          : 'No approved submission exists for the selected filters.'}
        {' '}Only approved submissions are included in finalized reports.
      </p>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
export function Pagination({ meta, onPage }) {
  if (!meta || meta.totalPages <= 1) return null;
  const { page, totalPages, total, perPage } = meta;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-600">
      <span>{from}–{to} of {total}</span>
      <div className="flex gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          className="rounded border border-slate-300 px-3 py-1 text-xs disabled:opacity-40 hover:bg-slate-50"
        >
          Previous
        </button>
        <span className="px-2 py-1 text-xs">Page {page} of {totalPages}</span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          className="rounded border border-slate-300 px-3 py-1 text-xs disabled:opacity-40 hover:bg-slate-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

