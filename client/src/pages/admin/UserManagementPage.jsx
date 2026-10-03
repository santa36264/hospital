import { useEffect, useState } from 'react';
import {
  PageHeader, FilterBar, FilterGroup, Card,
  LoadingState, EmptyState, ErrorState, Pagination,
  StatusBadge, Button, Label, Input, Select, FieldError,
  Notice, Dialog, DialogActions, TableRow, Td,
} from '../../components/reports';
import { ReportTable, TableHead } from '../../components/reports';
import {
  getUsers, createUser, updateUser, changeUserPassword,
  activateUser, deactivateUser,
} from '../../api/adminUsersApi';
import { UserPlus, Key, UserCheck, UserX } from 'lucide-react';

const ROLES = ['ADMIN', 'DATA_ENTRY', 'REPORTING', 'MANAGER'];
const ROLE_COLORS = {
  ADMIN:      'bg-blue-100 text-blue-800',
  DATA_ENTRY: 'bg-emerald-100 text-emerald-800',
  REPORTING:  'bg-purple-100 text-purple-800',
  MANAGER:    'bg-teal-100 text-teal-800',
};

function emptyForm() {
  return { name: '', email: '', role: 'DATA_ENTRY', password: '', status: 'ACTIVE' };
}

// ─── User form dialog ─────────────────────────────────────────────────────────
function UserFormDialog({ mode, initial, onClose, onSaved, setError }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isCreate = mode === 'create';

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim())  errs.name  = 'Name is required.';
    if (!form.email.trim()) errs.email = 'Email is required.';
    if (!ROLES.includes(form.role)) errs.role = 'Invalid role.';
    if (isCreate && (!form.password || form.password.length < 12))
      errs.password = 'Password must be at least 12 characters.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    try {
      if (isCreate) {
        await createUser({ name: form.name, email: form.email, role: form.role, password: form.password });
      } else {
        await updateUser(initial.id, { name: form.name, email: form.email, role: form.role, status: form.status });
      }
      onSaved();
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors && typeof serverErrors === 'object') {
        setErrors(serverErrors);
      } else {
        setError(err.response?.data?.message || 'Failed to save user.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={isCreate ? 'Create User' : 'Edit User'}
      description={isCreate ? 'Add a new system user with a role and initial password.' : 'Update user details, role, or status.'}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="u-name" required>Full Name</Label>
          <Input id="u-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} error={errors.name} autoComplete="name" />
          <FieldError message={errors.name} />
        </div>

        <div>
          <Label htmlFor="u-email" required>Email Address</Label>
          <Input id="u-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} error={errors.email} autoComplete="email" />
          <FieldError message={errors.email} />
        </div>

        <div>
          <Label htmlFor="u-role" required>Role</Label>
          <Select id="u-role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} error={errors.role}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </Select>
          <FieldError message={errors.role} />
        </div>

        {!isCreate && (
          <div>
            <Label htmlFor="u-status">Status</Label>
            <Select id="u-status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </Select>
          </div>
        )}

        {isCreate && (
          <div>
            <Label htmlFor="u-password" required>Initial Password</Label>
            <div className="relative">
              <Input
                id="u-password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                error={errors.password}
                autoComplete="new-password"
                className="pr-16"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <FieldError message={errors.password} />
            <p className="mt-1 text-xs text-slate-500">Minimum 12 characters required.</p>
          </div>
        )}

        <DialogActions>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" loading={saving}>{isCreate ? 'Create User' : 'Save Changes'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ─── Password dialog ──────────────────────────────────────────────────────────
function PasswordDialog({ user, onClose, onSaved, setError }) {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password || password.length < 12) {
      setFieldError('Password must be at least 12 characters.');
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
    <Dialog
      open
      onClose={onClose}
      title="Change Password"
      description={`Set a new password for ${user.email}. All active sessions for this user will be revoked.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <Label htmlFor="new-pass" required>New Password</Label>
          <div className="relative">
            <Input
              id="new-pass"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setFieldError(''); }}
              error={fieldError}
              autoComplete="new-password"
              className="pr-16"
            />
            <button
              type="button"
              onClick={() => setShow(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
          <FieldError message={fieldError} />
          <p className="mt-1 text-xs text-slate-500">Minimum 12 characters.</p>
        </div>
        <DialogActions>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" loading={saving}>Change Password</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, confirmLabel, variant = 'warning', onCancel, onConfirm }) {
  return (
    <Dialog open onClose={onCancel} title={title}>
      <p className="text-sm text-slate-600 mb-4">{message}</p>
      <DialogActions>
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="button" variant={variant} onClick={onConfirm}>{confirmLabel}</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dialog, setDialog] = useState(null);

  function formatDate(dt) {
    if (!dt) return '—';
    return new Date(dt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  async function load(page = 1) {
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
  }, [search, roleFilter, statusFilter]); // eslint-disable-line

  function closeDialog() { setDialog(null); }

  function savedNotice(msg) {
    setNotice(msg);
    closeDialog();
    load(1);
  }

  async function confirmAction(fn) {
    try {
      await fn();
      setNotice('Action completed successfully.');
      closeDialog();
      load(1);
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
          <Button onClick={() => setDialog({ type: 'create' })}>
            <UserPlus className="w-4 h-4" aria-hidden />
            Create User
          </Button>
        }
      />

      <FilterBar>
        <FilterGroup label="Search">
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Name or email…"
            className="w-56"
          />
        </FilterGroup>
        <FilterGroup label="Role">
          <Select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
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
        <LoadingState message="Loading users…" />
      ) : users.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No users found"
          message="Try adjusting your search or filters, or create a new user."
          action={<Button onClick={() => setDialog({ type: 'create' })}>Create User</Button>}
        />
      ) : (
        <Card>
          <ReportTable>
            <TableHead cols={[
              { label: 'Name' },
              { label: 'Email' },
              { label: 'Role' },
              { label: 'Status' },
              { label: 'Last Login' },
              { label: 'Created' },
              { label: 'Actions', right: true },
            ]} />
            <tbody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <Td>
                    <span className="font-medium text-slate-800">{u.name}</span>
                  </Td>
                  <Td>
                    <span className="text-slate-600">{u.email}</span>
                  </Td>
                  <Td>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[u.role] || 'bg-slate-100 text-slate-700'}`}>
                      {u.role}
                    </span>
                  </Td>
                  <Td><StatusBadge status={u.status} /></Td>
                  <Td><span className="text-slate-500 text-xs">{u.last_login_at ? formatDate(u.last_login_at) : '—'}</span></Td>
                  <Td><span className="text-slate-500 text-xs">{formatDate(u.created_at)}</span></Td>
                  <Td right>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setDialog({ type: 'edit', user: u })}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDialog({ type: 'password', user: u })}
                        className="text-xs text-slate-500 hover:underline font-medium"
                      >
                        Password
                      </button>
                      {u.status === 'ACTIVE' ? (
                        <button
                          onClick={() => setDialog({ type: 'deactivate', user: u })}
                          className="text-xs text-amber-600 hover:underline font-medium"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => confirmAction(() => activateUser(u.id))}
                          className="text-xs text-green-600 hover:underline font-medium"
                        >
                          Activate
                        </button>
                      )}
                    </div>
                  </Td>
                </TableRow>
              ))}
            </tbody>
          </ReportTable>
          <Pagination meta={{ ...pagination, perPage: pagination.pageSize }} onPage={p => load(p)} />
        </Card>
      )}

      {dialog?.type === 'create' && (
        <UserFormDialog
          mode="create"
          initial={emptyForm()}
          onClose={closeDialog}
          setError={setError}
          onSaved={() => savedNotice('User created successfully.')}
        />
      )}
      {dialog?.type === 'edit' && (
        <UserFormDialog
          mode="edit"
          initial={{ id: dialog.user.id, name: dialog.user.name, email: dialog.user.email, role: dialog.user.role, status: dialog.user.status }}
          onClose={closeDialog}
          setError={setError}
          onSaved={() => savedNotice('User updated successfully.')}
        />
      )}
      {dialog?.type === 'password' && (
        <PasswordDialog
          user={dialog.user}
          onClose={closeDialog}
          setError={setError}
          onSaved={() => savedNotice('Password changed. All sessions revoked.')}
        />
      )}
      {dialog?.type === 'deactivate' && (
        <ConfirmDialog
          title="Deactivate User"
          message={`Deactivate ${dialog.user.name} (${dialog.user.email})? Their active sessions will be revoked and they will not be able to sign in.`}
          confirmLabel="Deactivate"
          variant="warning"
          onCancel={closeDialog}
          onConfirm={() => confirmAction(() => deactivateUser(dialog.user.id))}
        />
      )}
    </div>
  );
}

export default UserManagementPage;
