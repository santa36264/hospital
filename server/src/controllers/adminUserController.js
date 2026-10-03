const adminUserService = require('../services/adminUserService');
const { normalizePagination } = require('../utils/pagination');

async function list(req, res, next) {
  try {
    const { page, pageSize } = normalizePagination(req.query);
    const data = await adminUserService.listUsers({
      search: req.query.search,
      role: req.query.role,
      status: req.query.status,
      page,
      pageSize,
    });
    res.json({ success: true, message: 'Users retrieved successfully.', data: data.items, pagination: data.pagination });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const data = await adminUserService.getUser(req.params.id);
    res.json({ success: true, message: 'User retrieved successfully.', data });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = await adminUserService.createUser(req.body || {}, req.user);
    res.status(201).json({ success: true, message: 'User created successfully.', data });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const data = await adminUserService.updateUser(req.params.id, req.body || {}, req.user);
    res.json({ success: true, message: 'User updated successfully.', data });
  } catch (err) { next(err); }
}

async function password(req, res, next) {
  try {
    const { password } = req.body || {};
    await adminUserService.changePassword(req.params.id, password, req.user);
    res.json({ success: true, message: 'Password changed successfully.', data: {} });
  } catch (err) { next(err); }
}

async function activate(req, res, next) {
  try {
    const data = await adminUserService.setStatus(req.params.id, 'ACTIVE', req.user);
    res.json({ success: true, message: 'User activated successfully.', data });
  } catch (err) { next(err); }
}

async function deactivate(req, res, next) {
  try {
    const data = await adminUserService.setStatus(req.params.id, 'INACTIVE', req.user);
    res.json({ success: true, message: 'User deactivated successfully.', data });
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, password, activate, deactivate };
