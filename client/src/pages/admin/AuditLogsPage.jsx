import { useEffect, useState } from 'react';
import { getAuditLogs } from '../../api/adminAuditApi';
import {
  PageHeader, FilterBar, FilterGroup, Card,
  LoadingState, EmptyState, ErrorState, Pagination,
  Notice, Dialog, DialogActions, Button,
  ReportTable, TableHead,
} from '../../components/reports';
import { Input } from '../../components/reports';
import { ShieldAlert, X } from 'lucide-react';

const ACTION_LABELS = {
  LOGIN_SUCCESS:            'Successful login',
  LOGIN_FAILED:             'Failed login attempt',
  LOGIN_BLOCKED_INACTIVE:   'Login blocked — inactive account',
  LOGOUT:                   'User signed out',
  SESSION_REFRESHED:        'Session refreshed',
  USER_CREATED:             'User account created',
  USER_UPDATED:             'User account updated',
  USER_ACTIVATED:           'User account activated',
  USER_DEACTIVATED:         'User account deactivated',
  USER_ROLE_CHANGED:        'User role changed',
  USER_PASSWORD_CHANGED:    'Password changed',
  DATASET_CREATED:          'Dataset created',
  DATASET_UPDATED:          'Dataset updated',
  DATASET_ACTIVATED:        'Dataset activated',
  DATASET_DEACTIVATED:      'Dataset deactivated',
  INDICATOR_CREATED:        'Indicator created',
  INDICATOR_UPDATED:        'Indicator updated',
  INDICATOR_ACTIVATED:      'Indicator activated',
  INDICATOR_DEACTIVATED:    'Indicator deactivated',
  REPORTING_PERIOD_CREATED: 'Reporting period created',
  REPORTING_PERIOD_UPDATED: 'Reporting period updated',
  REPORTING_PERIOD_OPENED:  'Reporting period opened',
  REPORTING_PERIOD_CLOSED:  'Reporting period closed',
  SUBMISSION_CREATED:       'Submission created',
  SUBMISSION_SUBMITTED:     'Submission submitted',
  SUBMISSION_UPDATED:       'Submission updated',
  SUBMISSION_REVIEW_STARTED:'Review started',
  SUBMISSION_APPROVED:      'Submission approved',
  SUBMISSION_RETURNED:      'Submission returned',
};

const ACTION_COLORS = {
  LOGIN_FAILED:           'bg-red-100 text-red-800',
  LOGIN_BLOCKED_INACTIVE: 'bg-red-100 text-red-800',
  USER_DEACTIVATED:       'bg-amber-100 text-amber-800',
  SUBMISSION_APPROVED:    'bg-green-100 text-green-800',
  SUBMISSION_RETURNED:    'bg-red-100 text-red-800',
};

function humanLabel(action) {
  return ACTION_LABELS[action] || action?.replace(/_/g, ' ')?.toLowerCase()?.replace(/\b\w/g, c => c.toUpperCase()) || action;
}

function formatTs(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function parseMeta(raw) {
  if (!raw) return null;
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return null; }
}

function AuditLogsPage() {
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [detail, setDetail] = useState(null);

  async function load(page = 1) {
    setLoading(true);
    setError('');
    try {
      const res = await getAuditLogs({
        search: search || undefined,
        action: actionFilter || undefined,
        resource_type: resourceType || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page,
        pageSize: 25,
      });
      setItems(res.data || []);
      setPagination(res.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => load(1), 250);
    return () => clearTimeout(t);
  }, [search, actionFilter, resourceType, dateFrom, dateTo]); // eslint-disable-line

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        subtitle="Append-only record of important system and administrative events."
      />

      <FilterBar>
        <FilterGroup label="Search">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Action, user, resource…"
            className="w-52"
          />
        </FilterGroup>
        <FilterGroup label="Event Type">
          <Input
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            placeholder="e.g. USER_CREATED"
            className="w-44"
          />
        </FilterGroup>
        <FilterGroup label="Resource">
          <Input
            value={resourceType}
            onChange={e => setResourceType(e.target.value)}
            placeholder="user, dataset…"
            className="w-36"
          />
        </FilterGroup>
        <FilterGroup label="From">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" />
        </FilterGroup>
        <FilterGroup label="To">
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" />
        </FilterGroup>
      </FilterBar>

      {error && <Notice variant="danger" onDismiss={() => setError('')} className="mb-4">{error}</Notice>}

      {loading ? (
        <LoadingState message="Loading audit logs…" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No audit records found"
          message="No events match the current filters."
        />
      ) : (
        <Card>
          <ReportTable>
            <TableHead cols={[
              { label: 'Timestamp' },
              { label: 'Activity' },
              { label: 'Actor' },
              { label: 'Resource' },
              { label: 'Resource ID' },
            ]} />
            <tbody>
              {items.map(a => (
                <tr
                  key={a.id}
                  className="border-t border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setDetail(a)}
                >
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {formatTs(a.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ACTION_COLORS[a.action] || 'bg-slate-100 text-slate-700'}`}>
                      {humanLabel(a.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {a.user_name || a.user_email || (a.user_id ? `User #${a.user_id}` : <span className="text-slate-400 italic">system</span>)}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{a.resource_type}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{a.resource_id || '—'}</td>
                </tr>
              ))}
            </tbody>
          </ReportTable>
          <Pagination meta={{ ...pagination, perPage: pagination.pageSize }} onPage={p => load(p)} />
        </Card>
      )}

      {/* Detail dialog */}
      {detail && (
        <Dialog
          open
          onClose={() => setDetail(null)}
          title={humanLabel(detail.action)}
          description={`${detail.resource_type}${detail.resource_id ? ` #${detail.resource_id}` : ''} · ${formatTs(detail.created_at)}`}
          maxWidth="max-w-lg"
        >
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mb-4">
            <dt className="text-slate-500 font-medium">Actor</dt>
            <dd className="text-slate-800">{detail.user_name || detail.user_email || 'system'}</dd>
            <dt className="text-slate-500 font-medium">Resource</dt>
            <dd className="text-slate-800">{detail.resource_type} {detail.resource_id ? `#${detail.resource_id}` : ''}</dd>
            <dt className="text-slate-500 font-medium">IP Address</dt>
            <dd className="text-slate-800">{parseMeta(detail.metadata)?.ip || '—'}</dd>
          </dl>

          {parseMeta(detail.metadata) && (() => {
            const meta = parseMeta(detail.metadata);
            const relevantKeys = Object.keys(meta).filter(k => k !== 'ip');
            if (!relevantKeys.length) return null;
            return (
              <>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Details</p>
                <pre className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs overflow-x-auto text-slate-700">
                  {JSON.stringify(Object.fromEntries(relevantKeys.map(k => [k, meta[k]])), null, 2)}
                </pre>
              </>
            );
          })()}

          {(detail.old_values || detail.new_values) && (
            <>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-3 mb-1">Changes</p>
              <pre className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs overflow-x-auto text-slate-700">
                {JSON.stringify({ before: parseMeta(detail.old_values), after: parseMeta(detail.new_values) }, null, 2)}
              </pre>
            </>
          )}

          <DialogActions>
            <Button variant="secondary" onClick={() => setDetail(null)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}

export default AuditLogsPage;
