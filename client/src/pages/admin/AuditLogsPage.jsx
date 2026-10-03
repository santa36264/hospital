import { useEffect, useState } from 'react';
import { getAuditLogs } from '../../api/adminAuditApi';
import {
  PageHeader,
  FilterBar,
  FilterGroup,
  inputClass,
  selectClass,
  LoadingState,
  EmptyState,
  ErrorState,
  Pagination,
} from '../../components/reports';

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
  }, [search, actionFilter, resourceType, dateFrom, dateTo]);

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Append-only record of important system and administrative events." />

      <FilterBar>
        <FilterGroup label="Search">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Action, entity, user" className={inputClass} />
        </FilterGroup>
        <FilterGroup label="Event">
          <input value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} placeholder="e.g. USER_CREATED" className={inputClass} />
        </FilterGroup>
        <FilterGroup label="Entity Type">
          <input value={resourceType} onChange={(e) => setResourceType(e.target.value)} placeholder="user, dataset…" className={inputClass} />
        </FilterGroup>
        <FilterGroup label="From">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputClass} />
        </FilterGroup>
        <FilterGroup label="To">
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputClass} />
        </FilterGroup>
      </FilterBar>

      {error && <div className="mb-3 rounded bg-red-50 text-red-700 px-3 py-2 text-sm">{error} <button onClick={() => load()} className="underline ml-2">Retry</button></div>}

      {loading ? (
        <LoadingState message="Loading audit logs…" />
      ) : items.length === 0 ? (
        <EmptyState title="No audit records" message="No records match the current filters." />
      ) : (
        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2">Timestamp</th>
                <th className="text-left px-4 py-2">User</th>
                <th className="text-left px-4 py-2">Event</th>
                <th className="text-left px-4 py-2">Entity</th>
                <th className="text-left px-4 py-2">Entity ID</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-t border-slate-100 cursor-pointer hover:bg-slate-50" onClick={() => setDetail(a)}>
                  <td className="px-4 py-2 text-slate-600 text-xs">{new Date(a.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2">{a.user_name || a.user_email || (a.user_id ? `#${a.user_id}` : 'system')}</td>
                  <td className="px-4 py-2 font-mono text-xs">{a.action}</td>
                  <td className="px-4 py-2">{a.resource_type}</td>
                  <td className="px-4 py-2 text-slate-500 text-xs">{a.resource_id || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination meta={{ ...pagination, perPage: pagination.pageSize }} onPage={(p) => load(p)} />
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-10" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">{detail.action}</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-slate-500">Timestamp</dt><dd>{new Date(detail.created_at).toLocaleString()}</dd>
              <dt className="text-slate-500">Actor</dt><dd>{detail.user_name || detail.user_email || 'system'}</dd>
              <dt className="text-slate-500">Entity</dt><dd>{detail.resource_type} {detail.resource_id ? `#${detail.resource_id}` : ''}</dd>
              <dt className="text-slate-500">IP</dt><dd>{parseMeta(detail.metadata)?.ip || '—'}</dd>
            </dl>
            {parseMeta(detail.metadata) && (
              <>
                <h4 className="mt-4 text-sm font-semibold text-slate-700">Metadata</h4>
                <pre className="mt-1 rounded bg-slate-50 p-3 text-xs overflow-x-auto">{JSON.stringify(parseMeta(detail.metadata), null, 2)}</pre>
              </>
            )}
            {(detail.old_values || detail.new_values) && (
              <>
                <h4 className="mt-4 text-sm font-semibold text-slate-700">Changes</h4>
                <pre className="mt-1 rounded bg-slate-50 p-3 text-xs overflow-x-auto">{JSON.stringify({ old: parseMeta(detail.old_values), new: parseMeta(detail.new_values) }, null, 2)}</pre>
              </>
            )}
            <div className="flex justify-end mt-4">
              <button onClick={() => setDetail(null)} className="px-4 py-2 text-sm text-slate-600">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditLogsPage;
