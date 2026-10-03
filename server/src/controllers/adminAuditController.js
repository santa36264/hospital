const adminAuditService = require('../services/adminAuditService');
const { normalizePagination } = require('../utils/pagination');

async function list(req, res, next) {
  try {
    const { page, pageSize } = normalizePagination(req.query);
    const data = await adminAuditService.listAuditLogs(
      {
        action: req.query.action,
        userId: req.query.user_id,
        resourceType: req.query.resource_type,
        dateFrom: req.query.date_from,
        dateTo: req.query.date_to,
        search: req.query.search,
        page,
        pageSize,
      },
      req.user,
      { ip: req.ip }
    );
    res.json({ success: true, message: 'Audit logs retrieved successfully.', data: data.items, pagination: data.pagination });
  } catch (err) { next(err); }
}

module.exports = { list };
