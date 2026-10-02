import { useEffect, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import {
  getReportingPeriods,
  createReportingPeriod,
  updateReportingPeriod,
  setReportingPeriodStatus,
} from '../api/reportingPeriodApi';

const PERIOD_TYPES = ['MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'];

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function monthlyRange(year, monthIndex) {
  const days = daysInMonth(year, monthIndex);
  const start = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
  const end = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(days).padStart(2, '0')}`;
  return { start, end };
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function ReportingPeriodsPage() {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [formMode, setFormMode] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ label: '', period_type: 'MONTHLY', start_date: '', end_date: '' });
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getReportingPeriods({
        search: search || undefined,
        status: statusFilter || undefined,
        period_type: typeFilter || undefined,
      });
      setPeriods(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reporting periods.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search, statusFilter, typeFilter]);

  function openCreate() {
    setEditing(null);
    setForm({ label: '', period_type: 'MONTHLY', start_date: '', end_date: '' });
    setFormErrors({});
    setFormMode('create');
  }

  function openEdit(period) {
    setEditing(period);
    setForm({
      label: period.label,
      period_type: period.period_type,
      start_date: (period.start_date || '').slice(0, 10),
      end_date: (period.end_date || '').slice(0, 10),
    });
    setFormErrors({});
    setFormMode('edit');
  }

  function deriveMonthly() {
    const { start, end } = monthlyRange(Number(year), Number(month));
    setForm((f) => ({
      ...f,
      label: `${MONTH_NAMES[Number(month)]} ${year}`,
      period_type: 'MONTHLY',
      start_date: start,
      end_date: end,
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    const errors = {};
    if (!form.label.trim()) errors.label = 'Label is required.';
    if (!form.period_type) errors.period_type = 'Period type is required.';
    if (!form.start_date) errors.start_date = 'Start date is required.';
    if (!form.end_date) errors.end_date = 'End date is required.';
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      errors.end_date = 'End date must not be before start date.';
    }
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    setError('');
    try {
      if (formMode === 'create') {
        await createReportingPeriod(form);
        setNotice('Reporting period created successfully.');
      } else {
        await updateReportingPeriod(editing.id, {
          label: form.label,
          start_date: form.start_date,
          end_date: form.end_date,
        });
        setNotice('Reporting period updated successfully.');
      }
      setFormMode(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save reporting period.');
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(period, status) {
    const verb = status === 'CLOSED' ? 'close' : 'open';
    if (!window.confirm(`${verb === 'close' ? 'Close' : 'Open'} period "${period.label}"?`)) return;
    setError('');
    try {
      await setReportingPeriodStatus(period.id, status);
      setNotice(`Period ${status === 'CLOSED' ? 'closed' : 'opened'}.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status.');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Reporting Periods</h2>
          <p className="text-slate-500 text-sm">Configure reporting periods for health-data collection.</p>
        </div>
        <button onClick={openCreate} className="rounded bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700">
          Create Period
        </button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input placeholder="Search label" value={search} onChange={(e) => setSearch(e.target.value)} className="rounded border border-slate-300 px-3 py-2 text-sm w-56" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="CLOSED">CLOSED</option>
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">All types</option>
          {PERIOD_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {notice && <div className="mb-3 rounded bg-green-50 text-green-700 px-3 py-2 text-sm">{notice}</div>}
      {error && <div className="mb-3 rounded bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}

      <div className="bg-white rounded shadow overflow-x-auto">
        {loading ? (
          <p className="p-4 text-slate-500">Loading…</p>
        ) : periods.length === 0 ? (
          <p className="p-4 text-slate-500">No reporting periods found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2">Label</th>
                <th className="text-left px-4 py-2">Type</th>
                <th className="text-left px-4 py-2">Start</th>
                <th className="text-left px-4 py-2">End</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{p.label}</td>
                  <td className="px-4 py-2">{p.period_type}</td>
                  <td className="px-4 py-2">{(p.start_date || '').slice(0, 10)}</td>
                  <td className="px-4 py-2">{(p.end_date || '').slice(0, 10)}</td>
                  <td className="px-4 py-2"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-2 text-right space-x-3">
                    <button onClick={() => openEdit(p)} className="text-blue-600 hover:underline">Edit</button>
                    {p.status === 'OPEN' ? (
                      <button onClick={() => setStatus(p, 'CLOSED')} className="text-amber-600 hover:underline">Close</button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formMode && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">{formMode === 'create' ? 'Create Reporting Period' : 'Edit Reporting Period'}</h3>

            {formMode === 'create' && (
              <div className="mb-4 rounded bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-700 mb-2">Quick monthly creation</p>
                <div className="flex gap-2">
                  <select value={month} onChange={(e) => setMonth(e.target.value)} className="rounded border border-slate-300 px-2 py-1 text-sm">
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={m} value={idx}>{m}</option>
                    ))}
                  </select>
                  <input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="rounded border border-slate-300 px-2 py-1 text-sm w-24" />
                  <button type="button" onClick={deriveMonthly} className="rounded bg-slate-700 text-white px-3 py-1 text-sm">Fill</button>
                </div>
              </div>
            )}

            <label className="block text-sm font-medium text-slate-700">Label</label>
            <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="mt-1 mb-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            {formErrors.label && <p className="text-red-600 text-xs mb-2">{formErrors.label}</p>}

            <label className="block text-sm font-medium text-slate-700">Period Type</label>
            <select value={form.period_type} onChange={(e) => setForm({ ...form, period_type: e.target.value })} disabled={formMode === 'edit'} className="mt-1 mb-2 w-full rounded border border-slate-300 px-3 py-2 text-sm">
              {PERIOD_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Start Date</label>
                <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
                {formErrors.start_date && <p className="text-red-600 text-xs">{formErrors.start_date}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">End Date</label>
                <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
                {formErrors.end_date && <p className="text-red-600 text-xs">{formErrors.end_date}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => setFormMode(null)} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
              <button type="submit" disabled={saving} className="rounded bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default ReportingPeriodsPage;
