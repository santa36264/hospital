import { useEffect, useState } from 'react';
import {
  PageHeader, FilterBar, FilterGroup, Card,
  LoadingState, EmptyState, ErrorState,
  StatusBadge, Button, Label, Input, Select,
  FieldError, Notice, Dialog, DialogActions,
  ReportTable, TableHead,
} from '../components/reports';
import {
  getReportingPeriods, createReportingPeriod, updateReportingPeriod, setReportingPeriodStatus,
} from '../api/reportingPeriodApi';
import { CalendarDays, Plus } from 'lucide-react';

const PERIOD_TYPES = ['MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}
function monthlyRange(year, monthIndex) {
  const days = daysInMonth(Number(year), Number(monthIndex));
  const m = String(Number(monthIndex) + 1).padStart(2, '0');
  return {
    start: `${year}-${m}-01`,
    end:   `${year}-${m}-${String(days).padStart(2, '0')}`,
  };
}

function emptyForm() {
  return { label: '', period_type: 'MONTHLY', start_date: '', end_date: '' };
}

function formatDate(dt) {
  if (!dt) return '—';
  return String(dt).slice(0, 10);
}

export default function ReportingPeriodsPage() {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Quick monthly helper
  const [month, setMonth] = useState(new Date().getMonth());
  const [year,  setYear]  = useState(new Date().getFullYear());

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getReportingPeriods({
        search:      search || undefined,
        status:      statusFilter || undefined,
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
  }, [search, statusFilter, typeFilter]); // eslint-disable-line

  function openCreate() {
    setForm(emptyForm());
    setFormErrors({});
    setDialog({ type: 'create' });
  }

  function openEdit(period) {
    setForm({
      label:       period.label,
      period_type: period.period_type,
      start_date:  String(period.start_date || '').slice(0, 10),
      end_date:    String(period.end_date   || '').slice(0, 10),
    });
    setFormErrors({});
    setDialog({ type: 'edit', period });
  }

  function fillMonthly() {
    const { start, end } = monthlyRange(year, month);
    setForm(f => ({
      ...f,
      label:      `${MONTH_NAMES[Number(month)]} ${year}`,
      period_type:'MONTHLY',
      start_date: start,
      end_date:   end,
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    const errors = {};
    if (!form.label.trim())      errors.label       = 'Label is required.';
    if (!form.period_type)       errors.period_type = 'Period type is required.';
    if (!form.start_date)        errors.start_date  = 'Start date is required.';
    if (!form.end_date)          errors.end_date    = 'End date is required.';
    if (form.start_date && form.end_date && form.end_date < form.start_date)
      errors.end_date = 'End date must not be before start date.';
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      if (dialog.type === 'create') {
        await createReportingPeriod(form);
        setNotice('Reporting period created successfully.');
      } else {
        await updateReportingPeriod(dialog.period.id, {
          label: form.label, start_date: form.start_date, end_date: form.end_date,
        });
        setNotice('Reporting period updated successfully.');
      }
      setDialog(null);
      await load();
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors && typeof serverErrors === 'object') setFormErrors(serverErrors);
      else setError(err.response?.data?.message || 'Failed to save reporting period.');
    } finally {
      setSaving(false);
    }
  }

  async function handleClose() {
    setSaving(true);
    try {
      await setReportingPeriodStatus(dialog.period.id, 'CLOSED');
      setNotice('Reporting period closed.');
      setDialog(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to close period.');
      setDialog(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Reporting Periods"
        subtitle="Configure time periods for health-data collection and reporting."
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" aria-hidden />
            New Period
          </Button>
        }
      />

      <FilterBar>
        <FilterGroup label="Search">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Label…" className="w-52" />
        </FilterGroup>
        <FilterGroup label="Status">
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </Select>
        </FilterGroup>
        <FilterGroup label="Type">
          <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">All types</option>
            {PERIOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </FilterGroup>
      </FilterBar>

      {notice && <Notice variant="success" onDismiss={() => setNotice('')} className="mb-4">{notice}</Notice>}
      {error  && <Notice variant="danger"  onDismiss={() => setError('')}  className="mb-4">{error}</Notice>}

      {loading ? (
        <LoadingState message="Loading reporting periods…" />
      ) : periods.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No reporting periods found"
          message={search || statusFilter || typeFilter ? 'Try adjusting your filters.' : 'Create a reporting period to allow data submissions.'}
          action={!search && !statusFilter && !typeFilter ? <Button onClick={openCreate}>Create Period</Button> : undefined}
        />
      ) : (
        <Card>
          <ReportTable>
            <TableHead cols={[
              { label: 'Label' },
              { label: 'Type' },
              { label: 'Start Date' },
              { label: 'End Date' },
              { label: 'Status' },
              { label: 'Actions', right: true },
            ]} />
            <tbody>
              {periods.map(p => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{p.label}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5 text-xs font-medium">{p.period_type}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 font-mono">{formatDate(p.start_date)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 font-mono">{formatDate(p.end_date)}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => openEdit(p)} className="text-xs text-blue-600 hover:underline font-medium">Edit</button>
                      {p.status === 'OPEN' && (
                        <button
                          onClick={() => setDialog({ type: 'close', period: p })}
                          className="text-xs text-amber-600 hover:underline font-medium"
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </ReportTable>
        </Card>
      )}

      {/* Create / Edit dialog */}
      {(dialog?.type === 'create' || dialog?.type === 'edit') && (
        <Dialog
          open
          onClose={() => setDialog(null)}
          title={dialog.type === 'create' ? 'Create Reporting Period' : 'Edit Reporting Period'}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSave} className="space-y-4" noValidate>
            {/* Quick monthly fill */}
            {dialog.type === 'create' && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Quick Monthly Creation</p>
                <div className="flex items-center gap-2">
                  <Select value={month} onChange={e => setMonth(e.target.value)} className="flex-1 text-sm">
                    {MONTH_NAMES.map((m, i) => <option key={m} value={i}>{m}</option>)}
                  </Select>
                  <Input type="number" value={year} onChange={e => setYear(e.target.value)} className="w-24 text-sm" min="2000" max="2100" />
                  <Button type="button" variant="secondary" size="sm" onClick={fillMonthly}>Fill</Button>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="rp-label" required>Label</Label>
              <Input id="rp-label" value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} error={formErrors.label} placeholder="e.g. January 2026" />
              <FieldError message={formErrors.label} />
            </div>
            <div>
              <Label htmlFor="rp-type" required>Period Type</Label>
              <Select id="rp-type" value={form.period_type} onChange={e => setForm({ ...form, period_type: e.target.value })} disabled={dialog.type === 'edit'}>
                {PERIOD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
              <FieldError message={formErrors.period_type} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rp-start" required>Start Date</Label>
                <Input id="rp-start" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} error={formErrors.start_date} />
                <FieldError message={formErrors.start_date} />
              </div>
              <div>
                <Label htmlFor="rp-end" required>End Date</Label>
                <Input id="rp-end" type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} error={formErrors.end_date} />
                <FieldError message={formErrors.end_date} />
              </div>
            </div>
            <DialogActions>
              <Button type="button" variant="secondary" onClick={() => setDialog(null)} disabled={saving}>Cancel</Button>
              <Button type="submit" loading={saving}>{dialog.type === 'create' ? 'Create Period' : 'Save Changes'}</Button>
            </DialogActions>
          </form>
        </Dialog>
      )}

      {/* Close confirmation */}
      {dialog?.type === 'close' && (
        <Dialog
          open
          onClose={() => setDialog(null)}
          title="Close Reporting Period"
          description={`Close "${dialog.period.label}"? Data entry users will no longer be able to submit new data for this period. This action cannot be reversed through normal operation.`}
        >
          <DialogActions>
            <Button type="button" variant="secondary" onClick={() => setDialog(null)} disabled={saving}>Cancel</Button>
            <Button type="button" variant="warning" loading={saving} onClick={handleClose}>Close Period</Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}
