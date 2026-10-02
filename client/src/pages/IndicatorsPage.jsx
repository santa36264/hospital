import { useEffect, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import { getDatasets } from '../api/datasetApi';
import {
  getIndicators,
  createIndicator,
  updateIndicator,
  setIndicatorStatus,
} from '../api/indicatorApi';

const DATA_TYPES = [
  { value: 'numeric', label: 'NUMERIC' },
  { value: 'decimal', label: 'DECIMAL' },
  { value: 'text', label: 'TEXT' },
  { value: 'date', label: 'DATE' },
  { value: 'yes/no', label: 'YES/NO (BOOLEAN)' },
  { value: 'percentage', label: 'PERCENTAGE' },
];

const NUMERIC_TYPES = ['numeric', 'decimal', 'percentage'];

function emptyForm() {
  return {
    dataset_id: '',
    code: '',
    name: '',
    description: '',
    data_type: 'numeric',
    required: false,
    min_value: '',
    max_value: '',
    precision: '',
  };
}

function IndicatorsPage() {
  const [indicators, setIndicators] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [datasetFilter, setDatasetFilter] = useState('');
  const [formMode, setFormMode] = useState(null);
  const [editing, setEditing] = useState(null);
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
    getDatasets()
      .then((res) => setDatasets(res.data || []))
      .catch(() => setError('Failed to load datasets.'));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search, statusFilter, datasetFilter]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFormErrors({});
    setFormMode('create');
  }

  function openEdit(indicator) {
    setEditing(indicator);
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
    setFormMode('edit');
  }

  const isNumeric = NUMERIC_TYPES.includes(form.data_type);

  async function handleSave(e) {
    e.preventDefault();
    const errors = {};
    if (!form.dataset_id) errors.dataset_id = 'Dataset is required.';
    if (!form.code.trim()) errors.code = 'Code is required.';
    if (!form.name.trim()) errors.name = 'Name is required.';
    if (!form.data_type) errors.data_type = 'Data type is required.';
    if (isNumeric) {
      if (form.min_value !== '' && isNaN(Number(form.min_value))) errors.min_value = 'Must be a number.';
      if (form.max_value !== '' && isNaN(Number(form.max_value))) errors.max_value = 'Must be a number.';
      if (form.min_value !== '' && form.max_value !== '' && Number(form.min_value) > Number(form.max_value)) {
        errors.max_value = 'Maximum must be >= minimum.';
      }
      if (form.precision !== '' && (!Number.isInteger(Number(form.precision)) || Number(form.precision) < 0 || Number(form.precision) > 10)) {
        errors.precision = 'Integer 0-10.';
      }
    }
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    setError('');
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
      if (formMode === 'create') {
        await createIndicator(payload);
        setNotice('Indicator created successfully.');
      } else {
        await updateIndicator(editing.id, payload);
        setNotice('Indicator updated successfully.');
      }
      setFormMode(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save indicator.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(indicator) {
    const next = indicator.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!window.confirm(`Change indicator "${indicator.name}" to ${next}?`)) return;
    setError('');
    try {
      await setIndicatorStatus(indicator.id, next);
      setNotice(`Indicator marked ${next}.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status.');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Indicators</h2>
          <p className="text-slate-500 text-sm">Configure measurable health-data indicators per dataset.</p>
        </div>
        <button onClick={openCreate} className="rounded bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700">
          Create Indicator
        </button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input placeholder="Search name or code" value={search} onChange={(e) => setSearch(e.target.value)} className="rounded border border-slate-300 px-3 py-2 text-sm w-64" />
        <select value={datasetFilter} onChange={(e) => setDatasetFilter(e.target.value)} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">All datasets</option>
          {datasets.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
      </div>

      {notice && <div className="mb-3 rounded bg-green-50 text-green-700 px-3 py-2 text-sm">{notice}</div>}
      {error && <div className="mb-3 rounded bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}

      <div className="bg-white rounded shadow overflow-x-auto">
        {loading ? (
          <p className="p-4 text-slate-500">Loading…</p>
        ) : indicators.length === 0 ? (
          <p className="p-4 text-slate-500">No indicators found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2">Dataset</th>
                <th className="text-left px-4 py-2">Code</th>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Type</th>
                <th className="text-left px-4 py-2">Required</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {indicators.map((i) => (
                <tr key={i.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{i.dataset_name}</td>
                  <td className="px-4 py-2 font-mono text-xs">{i.code}</td>
                  <td className="px-4 py-2">{i.name}</td>
                  <td className="px-4 py-2">{i.data_type}</td>
                  <td className="px-4 py-2">{i.required ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2"><StatusBadge status={i.status} /></td>
                  <td className="px-4 py-2 text-right space-x-3">
                    <button onClick={() => openEdit(i)} className="text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => toggleStatus(i)} className="text-amber-600 hover:underline">
                      {i.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formMode && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-semibold mb-4">{formMode === 'create' ? 'Create Indicator' : 'Edit Indicator'}</h3>

            <label className="block text-sm font-medium text-slate-700">Dataset</label>
            <select value={form.dataset_id} onChange={(e) => setForm({ ...form, dataset_id: e.target.value })} className="mt-1 mb-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" disabled={formMode === 'edit'}>
              <option value="">Select dataset…</option>
              {datasets.filter((d) => d.status === 'ACTIVE' || d.id === Number(form.dataset_id)).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {formErrors.dataset_id && <p className="text-red-600 text-xs mb-2">{formErrors.dataset_id}</p>}

            <label className="block text-sm font-medium text-slate-700">Code</label>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="mt-1 mb-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            {formErrors.code && <p className="text-red-600 text-xs mb-2">{formErrors.code}</p>}

            <label className="block text-sm font-medium text-slate-700">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 mb-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            {formErrors.name && <p className="text-red-600 text-xs mb-2">{formErrors.name}</p>}

            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="mt-1 mb-2 w-full rounded border border-slate-300 px-3 py-2 text-sm" />

            <label className="block text-sm font-medium text-slate-700">Data Type</label>
            <select value={form.data_type} onChange={(e) => setForm({ ...form, data_type: e.target.value })} className="mt-1 mb-2 w-full rounded border border-slate-300 px-3 py-2 text-sm">
              {DATA_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700 mb-3">
              <input type="checkbox" checked={form.required} onChange={(e) => setForm({ ...form, required: e.target.checked })} />
              Required indicator
            </label>

            {isNumeric && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Minimum</label>
                  <input value={form.min_value} onChange={(e) => setForm({ ...form, min_value: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm" placeholder={form.data_type === 'percentage' ? '0' : ''} />
                  {formErrors.min_value && <p className="text-red-600 text-xs">{formErrors.min_value}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Maximum</label>
                  <input value={form.max_value} onChange={(e) => setForm({ ...form, max_value: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm" placeholder={form.data_type === 'percentage' ? '100' : ''} />
                  {formErrors.max_value && <p className="text-red-600 text-xs">{formErrors.max_value}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Decimal Precision</label>
                  <input value={form.precision} onChange={(e) => setForm({ ...form, precision: e.target.value })} className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm" />
                  {formErrors.precision && <p className="text-red-600 text-xs">{formErrors.precision}</p>}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-2">
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

export default IndicatorsPage;
