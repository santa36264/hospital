import { useEffect, useState } from 'react';
import {
  PageHeader, FilterBar, FilterGroup, Card,
  LoadingState, EmptyState, ErrorState,
  StatusBadge, Button, Label, Input, Select, Textarea,
  FieldError, Notice, Dialog, DialogActions, ReportTable, TableHead,
} from '../components/reports';
import {
  getDatasets, createDataset, updateDataset, setDatasetStatus,
} from '../api/datasetApi';
import { Database, Plus } from 'lucide-react';

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
  const [dialog, setDialog] = useState(null); // {type: 'create'|'edit'|'status', dataset?}
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
  }, [search, statusFilter]); // eslint-disable-line

  function openCreate() {
    setForm(emptyForm());
    setFormErrors({});
    setDialog({ type: 'create' });
  }

  function openEdit(dataset) {
    setForm({ code: dataset.code, name: dataset.name, description: dataset.description || '' });
    setFormErrors({});
    setDialog({ type: 'edit', dataset });
  }

  async function handleSave(e) {
    e.preventDefault();
    const errors = {};
    if (!form.code.trim()) errors.code = 'Code is required.';
    if (!form.name.trim()) errors.name = 'Name is required.';
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    setSaving(true);
    try {
      if (dialog.type === 'create') {
        await createDataset(form);
        setNotice('Dataset created successfully.');
      } else {
        await updateDataset(dialog.dataset.id, form);
        setNotice('Dataset updated successfully.');
      }
      setDialog(null);
      await load();
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors && typeof serverErrors === 'object') {
        setFormErrors(serverErrors);
      } else {
        setError(err.response?.data?.message || 'Failed to save dataset.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusToggle() {
    const { dataset } = dialog;
    const next = dataset.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setSaving(true);
    try {
      await setDatasetStatus(dataset.id, next);
      setNotice(`Dataset marked ${next}.`);
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
        title="Datasets"
        subtitle="Manage the hospital's health-data reporting datasets."
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" aria-hidden />
            New Dataset
          </Button>
        }
      />

      <FilterBar>
        <FilterGroup label="Search">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Name or code…"
            className="w-56"
          />
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
        <LoadingState message="Loading datasets…" />
      ) : datasets.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No datasets found"
          message={search || statusFilter ? 'Try adjusting your filters.' : 'Create a dataset to get started.'}
          action={!search && !statusFilter ? <Button onClick={openCreate}>Create Dataset</Button> : undefined}
        />
      ) : (
        <Card>
          <ReportTable>
            <TableHead cols={[
              { label: 'Code' },
              { label: 'Dataset Name' },
              { label: 'Description' },
              { label: 'Status' },
              { label: 'Updated' },
              { label: 'Actions', right: true },
            ]} />
            <tbody>
              {datasets.map(d => (
                <tr key={d.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-slate-600 bg-slate-100 rounded px-2 py-0.5">{d.code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-slate-800">{d.name}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500 max-w-xs truncate">
                    {d.description || <span className="text-slate-300 italic">—</span>}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {d.updated_at ? new Date(d.updated_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => openEdit(d)} className="text-xs text-blue-600 hover:underline font-medium">Edit</button>
                      <button
                        onClick={() => { setDialog({ type: 'status', dataset: d }); }}
                        className={`text-xs font-medium hover:underline ${d.status === 'ACTIVE' ? 'text-amber-600' : 'text-green-600'}`}
                      >
                        {d.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
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
          title={dialog.type === 'create' ? 'Create Dataset' : 'Edit Dataset'}
          description={dialog.type === 'create' ? 'Add a new health-data dataset.' : `Editing: ${dialog.dataset?.name}`}
        >
          <form onSubmit={handleSave} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="ds-code" required>Dataset Code</Label>
              <Input
                id="ds-code"
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value })}
                error={formErrors.code}
                placeholder="e.g. ANC"
                disabled={dialog.type === 'edit'}
              />
              <FieldError message={formErrors.code} />
              {dialog.type === 'create' && <p className="mt-1 text-xs text-slate-500">Uppercase alphanumeric code. Cannot be changed after creation.</p>}
            </div>
            <div>
              <Label htmlFor="ds-name" required>Name</Label>
              <Input id="ds-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} error={formErrors.name} />
              <FieldError message={formErrors.name} />
            </div>
            <div>
              <Label htmlFor="ds-desc">Description</Label>
              <Textarea id="ds-desc" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <DialogActions>
              <Button type="button" variant="secondary" onClick={() => setDialog(null)} disabled={saving}>Cancel</Button>
              <Button type="submit" loading={saving}>{dialog.type === 'create' ? 'Create Dataset' : 'Save Changes'}</Button>
            </DialogActions>
          </form>
        </Dialog>
      )}

      {/* Status toggle confirmation */}
      {dialog?.type === 'status' && (
        <Dialog
          open
          onClose={() => setDialog(null)}
          title={dialog.dataset.status === 'ACTIVE' ? 'Deactivate Dataset' : 'Activate Dataset'}
          description={
            dialog.dataset.status === 'ACTIVE'
              ? `Deactivating "${dialog.dataset.name}" will prevent new submissions from using it.`
              : `Reactivating "${dialog.dataset.name}" will allow new submissions.`
          }
        >
          <DialogActions>
            <Button type="button" variant="secondary" onClick={() => setDialog(null)} disabled={saving}>Cancel</Button>
            <Button
              type="button"
              variant={dialog.dataset.status === 'ACTIVE' ? 'warning' : 'success'}
              loading={saving}
              onClick={handleStatusToggle}
            >
              {dialog.dataset.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}

export default DatasetsPage;
