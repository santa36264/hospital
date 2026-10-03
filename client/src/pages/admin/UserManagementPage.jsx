import { useEffect, useState } from 'react';
import StatusBadge from '../../components/StatusBadge';
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
import {
  getUsers,
  createUser,
  updateUser,
  changeUserPassword,
  activateUser,
  deactivateUser,
} from '../../api/adminUsersApi';

const ROLES = ['ADMIN', 'DATA_ENTRY', 'REPORTING', 'MANAGER'];

function emptyForm() {
  return { name: '', email: '', role: 'DATA_ENTRY', password: '', status: 'ACTIVE' };
}

function UserFormDialog({ mode, initial, onClose, onSaved, setError }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    if (!form.email.trim()) errs.email = 'Email is required.';
    if (!ROLES.includes(form.role)) errs.role = 'Invalid role.';
    if (mode === 'create' && (!form.password || form.password.length < 12)) {
      errs.password = 'Password must be at least 12 characters.';
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      if (mode === 'create') {
        await createUser({ name: form.name, email: form.email, role: form.role, password: form.password });
      } else {
        await updateUser(initial.id, { name: form.name, email: form.email, role: form.role, status: form.status });
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-10">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h3 className="text-lg font-semibold mb-4">{mode === 'create' ? 'Create User' : 'Edit User'}</h3>

        <label className="block text-sm font-medium text-slate-700">Full Name</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`${inputClass} mt-1 mb-1`} />
        {errors.name && <p className="text-red-600 text-xs mb-2">{errors.name}</p>}

        <label className="block text-sm font-medium text-slate-700">Email</label>
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={`${inputClass} mt-1 mb-1`} />
        {errors.email && <p className="text-red-600 text-xs mb-2">{errors.email}</p>}

        <label className="block text-sm font-medium text-slate-700">Role</label>
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={`${selectClass} mt-1 mb-1`}>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {errors.role && <p className="text-red-600 text-xs mb-2">{errors.role}</p>}

        {mode === 'edit' && (
          <>
            <label className="block text-sm font-medium text-slate-700 mt-2">Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={`${selectClass} mt-1 mb-1`}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </>
        )}

        {mode === 'create' && (
          <>
            <label className="block text-sm font-medium text-slate-700 mt-2">Initial Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={`${inputClass} mt-1 mb-1 pr-16`}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-3 text-sm text-blue-600">
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {errors.password && <p className="text-red-600 text-xs mb-2">{errors.password}</p>}
          </>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
          <button type="submit" disabled={saving} className="rounded bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

function PasswordDialog({ user, onClose, onSaved, setError }) {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error2, setError2] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password || password.length < 12) {
      setError2('Password must be at least 12 characters.');
      return;
    }
    setSaving(true);
    try {
      await changeUserPassword(user.id, password);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-10">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
        <h3 className="text-lg font-semibold mb-2">Change Password</h3>
        <p className="text-sm text-slate-500 mb-4">Set a new password for {user.email}. Active sessions will be revoked.</p>
        <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass}`} autoComplete="new-password" />
        <button type="button" onClick={() => setShow((v) => !v)} className="text-xs text-blue-600 mt-1">{show ? 'Hide' : 'Show'}</button>
        {error2 && <p className="text-red-600 text-xs mt-1">{error2}</p>}
        <div className="flex justify-end gap-3 mt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
          <button type="submit" disabled={saving} className="rounded bg-blue-600 text-white px-4 py-2 text-sm disabled:opacity-50">{saving ? 'Saving…' : 'Change Password'}</button>
        </div>
      </form>
    </div>
  );
}

function ConfirmDialog({ title, message, confirmLabel, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-10">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600">Cancel</button>
          <button onClick={onConfirm} className="rounded bg-amber-600 text-white px-4 py-2 text-sm">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialog, setDialog] = useState(null); // {type, user?}

  async function load(page = pagination.page) {
    setLoading(true);
    setError('');
    try {
      const res = await getUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        page,
        pageSize: pagination.pageSize,
      });
      setUsers(res.data || []);
      setPagination(res.pagination || pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => load(1), 250);
    return () => clearTimeout(t);
  }, [search, roleFilter, statusFilter]);

  function closeDialog() { setDialog(null); }
  function savedNotice(msg) { setNotice(msg); closeDialog(); load(); }

  async function confirmAction(fn) {
    try {
      await fn();
      setNotice('Action completed.');
      closeDialog();
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed.');
      closeDialog();
    }
  }

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Create and manage system users, roles, and account status."
        action={
          <button onClick={() => setDialog({ type: 'create' })} className="rounded bg-blue-600 text-white px-4 py-2 text-sm hover:bg-blue-700">
            Create User
          </button>
        }
      />

      <FilterBar>
        <FilterGroup label="Search">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or email" className={inputClass} />
        </FilterGroup>
        <FilterGroup label="Role">
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={selectClass}>
            <option value="">All</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </FilterGroup>
        <FilterGroup label="Status">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
            <option value="">All</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </FilterGroup>
      </FilterBar>

      {notice && <div className="mb-3 rounded bg-green-50 text-green-700 px-3 py-2 text-sm">{notice}</div>}
      {error && <div className="mb-3 rounded bg-red-50 text-red-700 px-3 py-2 text-sm">{error} <button onClick={() => load()} className="underline ml-2">Retry</button></div>}

      {loading ? (
        <LoadingState message="Loading users…" />
      ) : users.length === 0 ? (
        <EmptyState title="No users found" message="Try adjusting your search or filters." />
      ) : (
        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Email</th>
                <th className="text-left px-4 py-2">Role</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Last Login</th>
                <th className="text-left px-4 py-2">Created</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{u.name}</td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2"><span className="inline-block rounded bg-blue-50 text-blue-800 px-2 py-0.5 text-xs font-semibold">{u.role}</span></td>
                  <td className="px-4 py-2"><StatusBadge status={u.status} /></td>
                  <td className="px-4 py-2 text-slate-500 text-xs">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '—'}</td>
                  <td className="px-4 py-2 text-slate-500 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-right space-x-3 whitespace-nowrap">
                    <button onClick={() => setDialog({ type: 'edit', user: u })} className="text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => setDialog({ type: 'password', user: u })} className="text-slate-600 hover:underline">Password</button>
                    {u.status === 'ACTIVE' ? (
                      <button onClick={() => setDialog({ type: 'deactivate', user: u })} className="text-amber-600 hover:underline">Deactivate</button>
                    ) : (
                      <button onClick={() => confirmAction(() => activateUser(u.id))} className="text-green-600 hover:underline">Activate</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination meta={{ ...pagination, perPage: pagination.pageSize }} onPage={(p) => load(p)} />
        </div>
      )}

      {dialog?.type === 'create' && (
        <UserFormDialog mode="create" initial={emptyForm()} onClose={closeDialog} setError={setError} onSaved={() => savedNotice('User created successfully.')} />
      )}
      {dialog?.type === 'edit' && (
        <UserFormDialog mode="edit" initial={{ id: dialog.user.id, name: dialog.user.name, email: dialog.user.email, role: dialog.user.role, status: dialog.user.status }} onClose={closeDialog} setError={setError} onSaved={() => savedNotice('User updated successfully.')} />
      )}
      {dialog?.type === 'password' && (
        <PasswordDialog user={dialog.user} onClose={closeDialog} setError={setError} onSaved={() => savedNotice('Password changed successfully.')} />
      )}
      {dialog?.type === 'deactivate' && (
        <ConfirmDialog
          title="Deactivate User"
          message={`Deactivate ${dialog.user.email}? Their sessions will be revoked and they will not be able to sign in.`}
          confirmLabel="Deactivate"
          onCancel={closeDialog}
          onConfirm={() => confirmAction(() => deactivateUser(dialog.user.id))}
        />
      )}
    </div>
  );
}

export default UserManagementPage;
