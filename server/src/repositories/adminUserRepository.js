const { db } = require('../config/database');

async function list({ search, role, status, page = 1, pageSize = 25 } = {}) {
  const applyFilters = (q) => {
    if (role) q = q.where('roles.name', role);
    if (status) q = q.where('users.status', status);
    if (search) {
      q = q.where(function () {
        this.where('users.name', 'like', `%${search}%`).orWhere('users.email', 'like', `%${search}%`);
      });
    }
    return q;
  };

  const base = () =>
    db('users').join('roles', 'roles.id', 'users.role_id');

  const countRow = await applyFilters(base()).count({ total: 'users.id' }).first();
  const items = await applyFilters(
    base().select(
      'users.id', 'users.name', 'users.email', 'users.status',
      'users.last_login_at', 'users.created_at', 'roles.name as role'
    )
  )
    .orderBy('users.name', 'asc')
    .limit(Number(pageSize))
    .offset((Number(page) - 1) * Number(pageSize));

  return { items, total: Number(countRow.total), page: Number(page), pageSize: Number(pageSize) };
}

async function findById(id) {
  return db('users')
    .join('roles', 'roles.id', 'users.role_id')
    .select('users.id', 'users.name', 'users.email', 'users.status', 'users.last_login_at', 'users.created_at', 'roles.name as role')
    .where('users.id', id)
    .first();
}

async function findByEmail(email) {
  return db('users').where({ email }).first();
}

async function roleIdFor(roleName) {
  const row = await db('roles').where({ name: roleName }).first();
  return row ? row.id : null;
}

async function create({ name, email, passwordHash, roleId }) {
  const [id] = await db('users').insert({
    name,
    email,
    password_hash: passwordHash,
    role_id: roleId,
    status: 'ACTIVE',
  });
  return findById(id);
}

async function update(id, patch) {
  await db('users').where({ id }).update(patch);
  return findById(id);
}

async function countActiveAdmins() {
  const row = await db('users')
    .join('roles', 'roles.id', 'users.role_id')
    .where('roles.name', 'ADMIN')
    .where('users.status', 'ACTIVE')
    .count({ total: 'users.id' })
    .first();
  return Number(row.total);
}

module.exports = { list, findById, findByEmail, create, update, roleIdFor, countActiveAdmins };
