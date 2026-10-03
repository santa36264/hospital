/**
 * Shared report / page UI barrel file.
 * Re-exports from the central design system plus a few report-specific
 * helpers that pages continue to import from this path.
 *
 * Existing pages import from '../../components/reports' (or '../../../components/reports').
 * This barrel keeps those imports working while the design system lives in
 * components/ui/index.jsx.
 */


// ── Re-export design system primitives ───────────────────────────────────────
export {
  Button,
  IconButton,
  StatusBadge,
  Badge,
  Label,
  Input,
  Textarea,
  Select,
  FieldError,
  HelpText,
  Checkbox,
  Card,
  CardHeader,
  CardBody,
  StatCard,
  Alert,
  Dialog,
  DialogActions,
  Table,
 
  TableRow,
  Td,
  LoadingState,
  EmptyState,
  ErrorState,
  SkeletonRow,
  Pagination,
  PageHeader,
  FilterBar,
  FilterGroup,
  Notice,
  Divider,
  Tabs,
} from '../ui/index.jsx';

// ── Report-specific aliases used by existing pages ─────────────────────────
// (These maintain backward compat for existing page code that uses the old names)
export { Card as ReportCard } from '../ui/index.jsx';

// ReportCardHeader — backward compat wrapper
export function ReportCardHeader({ title, meta, badge }) {
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

// ReportTable — scrollable table wrapper
export function ReportTable({ children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

// TableHead — backward compat (cols: [{label, right, className}])
export function TableHead({ cols }) {
  return (
    <thead className="bg-slate-50 border-b border-slate-200">
      <tr>
        {cols.map((col, i) => (
          <th
            key={i}
            className={[
              'px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide',
              col.right ? 'text-right' : 'text-left',
              col.className || '',
            ].join(' ')}
          >
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// Input/Select class strings (backward compat for pages that spread these)
export const inputClass =
  'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors disabled:bg-slate-50';

export const selectClass =
  'block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors min-w-[160px]';

// ── Report-specific helpers ───────────────────────────────────────────────────

/**
 * Format an indicator value for display.
 */
export function formatIndicatorValue(value, dataType) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  if (dataType === 'percentage') return `${value}%`;
  if (dataType === 'yes/no') {
    const v = String(value).toLowerCase();
    return v === 'yes' || v === 'true' || v === '1' ? 'Yes' : 'No';
  }
  return String(value);
}

/**
 * "No approved data" notice shown in report pages.
 */
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
