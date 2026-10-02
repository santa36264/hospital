import { useEffect, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import {
  getDatasets,
  createDataset,
  updateDataset,
  setDatasetStatus,
} from '../api/datasetApi';

function emptyForm() {
  return { code: '', name: '', description: '' };
}

function DatasetsPage() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formMode, setFormMode] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await getDatasets({
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setDatasets(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load datasets.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search, statusFilter]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setFormErrors({});
    setFormMode('create');
  }

  function openEdit(dataset) {
    setEditing(dataset);
    setForm({
      code: dataset.code,
      name: dataset.name,
      description: dataset.description || '',
    });
    setFormErrors({});
    setFormMode('edit');
  }

  async function handleSave(e) {
    e.preventDefault();
    const errors = {};
    if (!form.code.trim()) errors.code = 'Code is required.';
    if (!form.name.trim()) errors.name = 'Name is required.';
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    setError('');
    try {
      if (formMode === 'create') {
        await createDataset(form);
        setNotice('Dataset created successfully.');
      } else {
        await updateDataset(editing.id, form);
        setNotice('Dataset updated successfully.');
      }
      setFormMode(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save dataset.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(dataset) {
    const next = dataset.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (!window.confirm(`Change dataset "${dataset.name}" to ${next}?`)) return;
    setError('');
    try {
      await setDatasetStatus(dataset.id, next);
      setNotice(`Dataset marked ${next}.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status.');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Datasets</h2>
          <p className="text-slate-500 text-sm">Configure logical groups of health indicators.</p>
        </div>
        <button onClick={openCreate} className="rounded bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700">
          Create Dataset
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <input placeholder="Search name or code" value={search} onChange={(e) => setSearch(e.target.value)} className="rounded border border-slate-300 px-3 py-2 text-sm w-64" />
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
        ) : datasets.length === 0 ? (
          <p className="p-4 text-slate-500">No datasets found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2">Code</th>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Description</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((d) => (
                <tr key={d.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-mono text-xs">{d.code}</td>
                  <td className="px-4 py-2">{d.name}</td>
                  <td className="px-4 py-2 text-slate-500">{d.description || '—'}</td>
                  <td className="px-4 py-2"><StatusBadge status={d.status} /></td>
                  <td className="px-4 py-2 text-right space-x-3">
                    <button onClick={() => openEdit(d)} className="text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => toggleStatus(d)} className="text-amber-600 hover:underline">
                      {d.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
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
          <form onSubmit={handleSave} className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">{formMode === 'create' ? 'Create Dataset' : 'Edit Dataset'}</h3>

            <label className="block text-sm font-medium text-slate-700">Code</label>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="mt-1 mb-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            {formErrors.code && <p className="text-red-600 text-xs mb-2">{formErrors.code}</p>}

            <label className="block text-sm font-medium text-slate-700">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 mb-1 w-full rounded border border-slate-300 px-3 py-2 text-sm" />
            {formErrors.name && <p className="text-red-600 text-xs mb-2">{formErrors.name}</p>}

            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1 mb-4 w-full rounded border border-slate-300 px-3 py-2 text-sm" />

            <div className="flex justify-end gap-3">
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

export default DatasetsPage;
