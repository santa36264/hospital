/**
 * Design System — Hospital Health Data Management System
 * Shared UI primitives used across every page and role.
 */

import { X, AlertCircle, CheckCircle, Info, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Button ───────────────────────────────────────────────────────────────────
const BUTTON_VARIANTS = {
  primary:   'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500 border border-transparent',
  secondary: 'bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400 border border-slate-300',
  danger:    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 border border-transparent',
  ghost:     'bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400 border border-transparent',
  success:   'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500 border border-transparent',
  warning:   'bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500 border border-transparent',
};

const BUTTON_SIZES = {
  sm:  'px-3 py-1.5 text-xs',
  md:  'px-4 py-2 text-sm',
  lg:  'px-5 py-2.5 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  children,
  ...props
}) {
  const base = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';
  return (
    <button
      className={`${base} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden />
      )}
      {children}
    </button>
  );
}

// ─── IconButton ───────────────────────────────────────────────────────────────
export function IconButton({ icon: Icon, label, size = 'md', variant = 'ghost', className = '', ...props }) {
  const sizes = { sm: 'w-7 h-7', md: 'w-8 h-8', lg: 'w-9 h-9' };
  const iconSizes = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-5 h-5' };
  const base = 'inline-flex items-center justify-center rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50';
  return (
    <button
      aria-label={label}
      title={label}
      className={`${base} ${sizes[size]} ${BUTTON_VARIANTS[variant]} focus-visible:ring-slate-400 ${className}`}
      {...props}
    >
      <Icon className={iconSizes[size]} aria-hidden />
    </button>
  );
}

// ─── Badge / StatusBadge ──────────────────────────────────────────────────────
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

const STATUS_LABELS = {
  UNDER_REVIEW: 'Under Review',
};

export function StatusBadge({ status, className = '' }) {
  const style = STATUS_STYLES[status] || 'bg-slate-100 text-slate-700';
  const label = STATUS_LABELS[status] || (status?.replace(/_/g, ' ') ?? '');
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${style} ${className}`}>
      {label}
    </span>
  );
}

export function Badge({ color = 'slate', children, className = '' }) {
  const colors = {
    blue:   'bg-blue-100 text-blue-800',
    green:  'bg-green-100 text-green-800',
    amber:  'bg-amber-100 text-amber-800',
    red:    'bg-red-100 text-red-800',
    purple: 'bg-purple-100 text-purple-800',
    slate:  'bg-slate-100 text-slate-700',
    teal:   'bg-teal-100 text-teal-800',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[color] || colors.slate} ${className}`}>
      {children}
    </span>
  );
}

// ─── Form elements ────────────────────────────────────────────────────────────
export function Label({ children, required, htmlFor, className = '' }) {
  return (
    <label htmlFor={htmlFor} className={`block text-sm font-medium text-slate-700 mb-1 ${className}`}>
      {children}
      {required && <span className="text-red-500 ml-1" aria-hidden>*</span>}
      {required && <span className="sr-only"> (required)</span>}
    </label>
  );
}

const inputBase = 'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 disabled:bg-slate-50 disabled:cursor-not-allowed';

export function Input({ error, className = '', ...props }) {
  return (
    <input
      className={`${inputBase} ${error ? 'border-red-400 focus-visible:ring-red-400' : 'border-slate-300'} ${className}`}
      aria-invalid={error ? 'true' : undefined}
      {...props}
    />
  );
}

export function Textarea({ error, className = '', rows = 3, ...props }) {
  return (
    <textarea
      rows={rows}
      className={`${inputBase} resize-none ${error ? 'border-red-400 focus-visible:ring-red-400' : 'border-slate-300'} ${className}`}
      aria-invalid={error ? 'true' : undefined}
      {...props}
    />
  );
}

export function Select({ error, className = '', children, ...props }) {
  return (
    <select
      className={`${inputBase} ${error ? 'border-red-400 focus-visible:ring-red-400' : 'border-slate-300'} ${className}`}
      aria-invalid={error ? 'true' : undefined}
      {...props}
    >
      {children}
    </select>
  );
}

export function FieldError({ message, id }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs text-red-600 flex items-center gap-1" role="alert">
      <AlertCircle className="w-3 h-3 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

export function HelpText({ children }) {
  return <p className="mt-1 text-xs text-slate-500">{children}</p>;
}

export function Checkbox({ label, ...props }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
        {...props}
      />
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', padding = true }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${padding ? '' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-slate-800 leading-snug">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return <div className={`px-6 py-5 ${className}`}>{children}</div>;
}

// ─── Section ──────────────────────────────────────────────────────────────────
export function Section({ children, className = '' }) {
  return <section className={`space-y-4 ${className}`}>{children}</section>;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, accent = 'border-slate-300', className = '' }) {
  return (
    <div className={`bg-white rounded-xl border-l-4 ${accent} border border-slate-200 shadow-sm px-5 py-4 ${className}`}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold text-slate-800 mt-1 leading-none">{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Alert ────────────────────────────────────────────────────────────────────
const ALERT_STYLES = {
  info:    { wrapper: 'bg-blue-50 border-blue-200 text-blue-800',    icon: Info,          iconClass: 'text-blue-500' },
  success: { wrapper: 'bg-green-50 border-green-200 text-green-800', icon: CheckCircle,   iconClass: 'text-green-500' },
  warning: { wrapper: 'bg-amber-50 border-amber-200 text-amber-800', icon: AlertTriangle, iconClass: 'text-amber-500' },
  danger:  { wrapper: 'bg-red-50 border-red-200 text-red-800',       icon: AlertCircle,   iconClass: 'text-red-500' },
};

export function Alert({ variant = 'info', title, children, action, onDismiss, className = '' }) {
  const s = ALERT_STYLES[variant];
  const Icon = s.icon;
  return (
    <div className={`rounded-xl border px-4 py-3 flex items-start gap-3 ${s.wrapper} ${className}`} role="alert">
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${s.iconClass}`} aria-hidden />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-sm leading-snug">{title}</p>}
        {children && <div className="text-sm mt-0.5">{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 ml-1 opacity-70 hover:opacity-100 transition-opacity" aria-label="Dismiss">
          <X className="w-4 h-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

// ─── Dialog ───────────────────────────────────────────────────────────────────
export function Dialog({ open, onClose, title, description, children, maxWidth = 'max-w-md' }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[1px]"
      onClick={onClose}
      onKeyDown={e => e.key === 'Escape' && onClose?.()}
      tabIndex={-1}
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? 'dialog-title' : undefined}
      aria-describedby={description ? 'dialog-desc' : undefined}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl w-full ${maxWidth} overflow-hidden`}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            {title && <h2 id="dialog-title" className="text-lg font-semibold text-slate-800">{title}</h2>}
            {description && <p id="dialog-desc" className="text-sm text-slate-500 mt-1">{description}</p>}
          </div>
          {onClose && (
            <button onClick={onClose} aria-label="Close dialog" className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" aria-hidden />
            </button>
          )}
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function DialogActions({ children }) {
  return (
    <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 mt-4">
      {children}
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────
export function Table({ children, className = '' }) {
  return (
    <div className="overflow-x-auto rounded-b-xl">
      <table className={`w-full text-sm ${className}`}>{children}</table>
    </div>
  );
}

export function TableHead({ columns }) {
  return (
    <thead>
      <tr className="bg-slate-50 border-b border-slate-200">
        {columns.map((col, i) => (
          <th
            key={i}
            className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap ${col.right ? 'text-right' : 'text-left'} ${col.className || ''}`}
          >
            {col.label}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function TableRow({ children, className = '', onClick }) {
  return (
    <tr
      className={`border-t border-slate-100 hover:bg-slate-50 transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

export function Td({ children, right = false, className = '' }) {
  return (
    <td className={`px-4 py-3 ${right ? 'text-right' : ''} ${className}`}>
      {children}
    </td>
  );
}

// ─── Loading / Empty / Error States ──────────────────────────────────────────
export function LoadingState({ message = 'Loading…' }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
      <div
        className="inline-block w-8 h-8 border-[3px] border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4"
        role="status"
        aria-label={message}
      />
      <p className="text-slate-500 text-sm">{message}</p>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message, action, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center ${className}`}>
      {Icon && (
        <div className="flex justify-center mb-4">
          <Icon className="w-10 h-10 text-slate-300" aria-hidden />
        </div>
      )}
      <p className="font-semibold text-slate-700 text-base">{title}</p>
      {message && <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="bg-white rounded-xl border border-red-100 shadow-sm p-10 text-center">
      <AlertCircle className="w-10 h-10 text-red-300 mx-auto mb-3" aria-hidden />
      <p className="text-red-700 font-semibold text-base mb-1">Something went wrong</p>
      <p className="text-slate-500 text-sm mb-5 max-w-sm mx-auto">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="secondary" size="sm">
          Try again
        </Button>
      )}
    </div>
  );
}

// ─── Inline loading skeleton rows ─────────────────────────────────────────────
export function SkeletonRow({ cols = 5 }) {
  return (
    <tr className="border-t border-slate-100 animate-pulse">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 rounded bg-slate-200" style={{ width: `${60 + Math.random() * 30}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Pagination ────────────────────────────────────────────────────────────────
export function Pagination({ meta, onPage }) {
  if (!meta || meta.totalPages <= 1) return null;
  const { page, totalPages, total, perPage } = meta;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-600">
      <span className="text-xs text-slate-500">
        {from}–{to} of {total} results
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden />
        </button>
        <span className="px-3 py-1 text-xs font-medium text-slate-600">
          {page} / {totalPages}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <ChevronRight className="w-4 h-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

// ─── Page Header ─────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action, breadcrumb }) {
  return (
    <div className="mb-6">
      {breadcrumb && (
        <nav className="mb-2 flex items-center gap-1 text-xs text-slate-500" aria-label="Breadcrumb">
          {breadcrumb}
        </nav>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-800 leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

// ─── Filter Bar ────────────────────────────────────────────────────────────────
export function FilterBar({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 mb-5 ${className}`}>
      <div className="flex flex-wrap items-end gap-3">{children}</div>
    </div>
  );
}

export function FilterGroup({ label, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 min-w-[150px] ${className}`}>
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      {children}
    </div>
  );
}

// ─── Notice (inline success/info strip) ──────────────────────────────────────
export function Notice({ variant = 'success', children, onDismiss }) {
  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    info:    'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    danger:  'bg-red-50 border-red-200 text-red-800',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 text-sm font-medium ${styles[variant]}`}>
      <span>{children}</span>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss" className="opacity-70 hover:opacity-100 transition-opacity">
          <X className="w-4 h-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
export function Divider({ className = '' }) {
  return <hr className={`border-slate-200 ${className}`} />;
}

// ─── Key-Value List ───────────────────────────────────────────────────────────
export function KeyValueList({ items }) {
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
      {items.map(({ label, value }) => (
        <>
          <dt className="text-slate-500 font-medium">{label}</dt>
          <dd className="text-slate-800">{value ?? '—'}</dd>
        </>
      ))}
    </dl>
  );
}

// ─── Tab Bar ─────────────────────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 border-b border-slate-200 mb-5" role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 -mb-px ${
            active === tab.id
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${active === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
