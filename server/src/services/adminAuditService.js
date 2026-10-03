const adminAuditRepository = require('../repositories/adminAuditRepository');
const auditLogRepository = require('../repositories/auditLogRepository');

async function listAuditLogs(filters, actor, meta = {}) {
  const page = Number(filters.page || 1);
  const data = await adminAuditRepository.list(filters);

  // Log meaningful access (first page only, to avoid per-click noise).
  if (page === 1 && !filters._logged) {
    await auditLogRepository.log({
      userId: actor.id,
      action: 'AUDIT_LOG_VIEWED',
      resourceType: 'audit_logs',
      metadata: { ip: meta.ip, filters: { action: filters.action, resourceType: filters.resourceType } },
    });
  }

  return {
    items: data.items,
    pagination: {
      page: data.page,
      pageSize: data.pageSize,
      total: data.total,
      totalPages: Math.max(1, Math.ceil(data.total / data.pageSize)),
    },
  };
}

module.exports = { listAuditLogs };
