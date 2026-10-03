import { useEffect, useState } from 'react';
import {
  PageHeader, FilterBar, FilterGroup, Card,
  LoadingState, EmptyState, ErrorState,
  StatusBadge, Button, Label, Input, Select, Textarea,
  FieldError, Notice, Dialog, DialogActions,
  ReportTable, TableHead,
} from '../components/reports';
import { getDatasets } from '../api/datasetApi';
import {
  getIndicators, createIndicator, updateIndicator, setIndicatorStatus,
} from '../api/indicatorApi';
import { ListChecks, Plus } from 'lucide-react';

const DATA_TYPES = [
  { value: 'numeric',    label: 'Numeric (integer)' },
  { value: 'decimal',    label: 'Decimal' },
  { value: 'text',       label: 'Text' },
  { value: 'date',       label: 'Date' },
  { value: 'yes/no',     label: 'Yes / No (Boolean)' },
  { value: 'percentage', label: 'Percentage' },
];
const NUMERIC_TYPES = ['numeric', 'decimal', 'percentage'];

function emptyForm() {
  return {
    dataset_id: '', code: '', name: '', description: '',
    data_type: 'numeric', required: false,
    min_value: '', max_value: '', precision: '',
  };
}

export default function IndicatorsPage() {
  const [indicators, setIndicators] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [datasetFilter, setDatasetFilter] = useState('');
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getIndicators({
        search: search || undefined,
        status: statusFilter || undefined,
        dataset_id: datasetFilter || undefined,
      });
      setIndicators(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load indicators.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    getDatasets().then(res => setDatasets(res.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search, statusFilter, datasetFilter]); // eslint-disable-line

  const isNumeric = NUMERIC_TYPES.includes(form.data_type);

  function openCreate() {
    setForm(emptyForm());
    setFormErrors({});
    setDialog({ type: 'create' });
  }

  function openEdit(indicator) {
    setForm({
      dataset_id: indicator.dataset_id,
      code: indicator.code,
      name: indicator.name,
      description: indicator.description || '',
      data_type: indicator.data_type,
      required: Boolean(indicator.required),
      min_value: indicator.min_value ?? '',
      max_value: indicator.max_value ?? '',
      precision: indicator.precision ?? '',
    });
    setFormErrors({});
    setDialog({ type: 'edit', indicator });
  }

  async function handleSave(e) {
    e.preventDefault();
    const errors = {};
    if (!form.dataset_id)    errors.dataset_id = 'Dataset is required.';
    if (!form.code.trim())   errors.code       = 'Code is required.';
    if (!form.name.trim())   errors.name       = 'Name is required.';
    if (!form.data_type)     errors.data_type  = 'Data type is required.';
    if (isNumeric) {
      if (form.min_value !== '' && isNaN(Number(form.min_value))) errors.min_value = 'Must be a number.';
      if (form.max_value !== '' && isNaN(Number(form.max_value))) errors.max_value = 'Must be a number.';
      if (form.min_value !== '' && form.max_value !== '' && Number(form.min_value) > Number(form.max_value)) errors.max_value = 'Max must be ≥ min.';
      if (form.precision !== '') {
        const p = Number(form.precision);
        if (!Number.isInteger(p) || p < 0 || p > 10) errors.precision = 'Integer 0–10.';
      }
    }
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    const payload = {
      dataset_id: Number(form.dataset_id),
      code: form.code,
      name: form.name,
      description: form.description,
      data_type: form.data_type,
      required: form.required,
      min_value: isNumeric && form.min_value !== '' ? Number(form.min_value) : undefined,
      max_value: isNumeric && form.max_value !== '' ? Number(form.max_value) : undefined,
      precision: isNumeric && form.precision !== '' ? Number(form.precision) : undefined,
    };
    try {
      if (dialog.type === 'create') {
        await createIndicator(payload);
        setNotice('Indicator created successfully.');
      } else {
        await updateIndicator(dialog.indicator.id, payload);
        setNotice('Indicator updated successfully.');
      }
      setDialog(null);
      await load();
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors && typeof serverErrors === 'object') setFormErrors(serverErrors);
      else setError(err.response?.data?.message || 'Failed to save indicator.');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusToggle() {
    const { indicator } = dialog;
    const next = indicator.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setSaving(true);
    try {
      await setIndicatorStatus(indicator.id, next);
      setNotice(`Indicator marked ${next}.`);
      setDialog(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status.');
      setDialog(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Indicators"
        subtitle="Configure measurable health-data indicators per dataset."
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" aria-hidden />
            New Indicator
          </Button>
        }
      />

      <FilterBar>
        <FilterGroup label="Search">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or code…" className="w-52" />
        </FilterGroup>
        <FilterGroup label="Dataset">
          <Select value={datasetFilter} onChange={e => setDatasetFilter(e.target.value)}>
            <option value="">All datasets</option>
            {datasets.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </FilterGroup>
        <FilterGroup label="Status">
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </FilterGroup>
      </FilterBar>

      {notice && <Notice variant="success" onDismiss={() => setNotice('')} className="mb-4">{notice}</Notice>}
      {error  && <Notice variant="danger"  onDismiss={() => setError('')}  className="mb-4">{error}</Notice>}

      {loading ? (
        <LoadingState message="Loading indicators…" />
      ) : indicators.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No indicators found"
          message={search || statusFilter || datasetFilter ? 'Try adjusting your filters.' : 'Create an indicator to get started.'}
          action={!search && !statusFilter && !datasetFilter ? <Button onClick={openCreate}>Create Indicator</Button> : undefined}
        />
      ) : (
        <Card>
          <ReportTable>
            <TableHead cols={[
              { label: 'Dataset' },
              { label: 'Code' },
              { label: 'Indicator Name' },
              { label: 'Type' },
              { label: 'Required' },
              { label: 'Status' },
              { label: 'Actions', right: true },
            ]} />
            <tbody>
              {indicators.map(i => (
                <tr key={i.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-slate-600">{i.dataset_name}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 rounded px-2 py-0.5">{i.code}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{i.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5 text-xs font-medium">{i.data_type}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {i.required
                      ? <span className="text-red-600 font-medium text-xs">Required</span>
                      : <span className="text-slate-400 text-xs">Optional</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => openEdit(i)} className="text-xs text-blue-600 hover:underline font-medium">Edit</button>
                      <button
                        onClick={() => setDialog({ type: 'status', indicator: i })}
                        className={`text-xs font-medium hover:underline ${i.status === 'ACTIVE' ? 'text-amber-600' : 'text-green-600'}`}
                      >
                        {i.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
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
          title={dialog.type === 'create' ? 'Create Indicator' : 'Edit Indicator'}
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleSave} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1" noValidate>
            <div>
              <Label htmlFor="ind-dataset" required>Dataset</Label>
              <Select
                id="ind-dataset"
                value={form.dataset_id}
                onChange={e => setForm({ ...form, dataset_id: e.target.value })}
                error={formErrors.dataset_id}
                disabled={dialog.type === 'edit'}
              >
                <option value="">Select dataset…</option>
                {datasets.filter(d => d.status === 'ACTIVE' || d.id === Number(form.dataset_id)).map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </Select>
              <FieldError message={formErrors.dataset_id} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ind-code" required>Code</Label>
                <Input id="ind-code" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} error={formErrors.code} />
                <FieldError message={formErrors.code} />
              </div>
              <div>
                <Label htmlFor="ind-type" required>Data Type</Label>
                <Select id="ind-type" value={form.data_type} onChange={e => setForm({ ...form, data_type: e.target.value })}>
                  {DATA_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </Select>
                <FieldError message={formErrors.data_type} />
              </div>
            </div>
            <div>
              <Label htmlFor="ind-name" required>Indicator Name</Label>
              <Input id="ind-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} error={formErrors.name} />
              <FieldError message={formErrors.name} />
            </div>
            <div>
              <Label htmlFor="ind-desc">Description</Label>
              <Textarea id="ind-desc" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.required} onChange={e => setForm({ ...form, required: e.target.checked })} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span className="text-sm text-slate-700">Required indicator</span>
              </label>
            </div>
            {isNumeric && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Validation Rules</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="ind-min">Minimum</Label>
                    <Input id="ind-min" value={form.min_value} onChange={e => setForm({ ...form, min_value: e.target.value })} error={formErrors.min_value} placeholder={form.data_type === 'percentage' ? '0' : ''} />
                    <FieldError message={formErrors.min_value} />
                  </div>
                  <div>
                    <Label htmlFor="ind-max">Maximum</Label>
                    <Input id="ind-max" value={form.max_value} onChange={e => setForm({ ...form, max_value: e.target.value })} error={formErrors.max_value} placeholder={form.data_type === 'percentage' ? '100' : ''} />
                    <FieldError message={formErrors.max_value} />
                  </div>
                  <div>
                    <Label htmlFor="ind-prec">Precision</Label>
                    <Input id="ind-prec" value={form.precision} onChange={e => setForm({ ...form, precision: e.target.value })} error={formErrors.precision} placeholder="0–10" />
                    <FieldError message={formErrors.precision} />
                  </div>
                </div>
              </div>
            )}
            <DialogActions>
              <Button type="button" variant="secondary" onClick={() => setDialog(null)} disabled={saving}>Cancel</Button>
              <Button type="submit" loading={saving}>{dialog.type === 'create' ? 'Create Indicator' : 'Save Changes'}</Button>
            </DialogActions>
          </form>
        </Dialog>
      )}

      {/* Status confirmation */}
      {dialog?.type === 'status' && (
        <Dialog
          open
          onClose={() => setDialog(null)}
          title={dialog.indicator.status === 'ACTIVE' ? 'Deactivate Indicator' : 'Activate Indicator'}
          description={
            dialog.indicator.status === 'ACTIVE'
              ? `"${dialog.indicator.name}" will no longer appear in new submission forms.`
              : `"${dialog.indicator.name}" will appear in new submission forms.`
          }
        >
          <DialogActions>
            <Button type="button" variant="secondary" onClick={() => setDialog(null)} disabled={saving}>Cancel</Button>
            <Button type="button" variant={dialog.indicator.status === 'ACTIVE' ? 'warning' : 'success'} loading={saving} onClick={handleStatusToggle}>
              {dialog.indicator.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}
