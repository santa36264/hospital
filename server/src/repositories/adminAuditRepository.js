const { db } = require('../config/database');

async function list({ action, userId, resourceType, dateFrom, dateTo, search, page = 1, pageSize = 25 } = {}) {
  const applyFilters = (q) => {
    if (action) q = q.where('audit_logs.action', action);
    if (userId) q = q.where('audit_logs.user_id', userId);
    if (resourceType) q = q.where('audit_logs.resource_type', resourceType);
    if (dateFrom) q = q.where('audit_logs.created_at', '>=', dateFrom);
    if (dateTo) q = q.where('audit_logs.created_at', '<=', dateTo);
    if (search) {
      q = q.where(function () {
        this.where('audit_logs.action', 'like', `%${search}%`)
          .orWhere('audit_logs.resource_type', 'like', `%${search}%`)
          .orWhere('audit_logs.resource_id', 'like', `%${search}%`)
          .orWhere('users.name', 'like', `%${search}%`)
          .orWhere('users.email', 'like', `%${search}%`);
      });
    }
    return q;
  };

  const base = () =>
    db('audit_logs').leftJoin('users', 'users.id', 'audit_logs.user_id');

  const countRow = await applyFilters(base()).count({ total: 'audit_logs.id' }).first();
  const items = await applyFilters(
    base().select(
      'audit_logs.id',
      'audit_logs.action',
      'audit_logs.resource_type',
      'audit_logs.resource_id',
      'audit_logs.user_id',
      'audit_logs.old_values',
      'audit_logs.new_values',
      'audit_logs.metadata',
      'audit_logs.created_at',
      'users.name as user_name',
      'users.email as user_email'
    )
  )
    .orderBy('audit_logs.created_at', 'desc')
    .orderBy('audit_logs.id', 'desc')
    .limit(Number(pageSize))
    .offset((Number(page) - 1) * Number(pageSize));

  return { items, total: Number(countRow.total), page: Number(page), pageSize: Number(pageSize) };
}

module.exports = { list };
