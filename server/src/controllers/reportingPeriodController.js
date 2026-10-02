const reportingPeriodService = require('../services/reportingPeriodService');

async function list(req, res, next) {
  try {
    const data = await reportingPeriodService.list({
      search: req.query.search,
      status: req.query.status,
      periodType: req.query.period_type,
    });
    res.json({ success: true, message: 'Reporting periods retrieved successfully.', data });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const data = await reportingPeriodService.getById(req.params.id);
    res.json({ success: true, message: 'Reporting period retrieved successfully.', data });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = await reportingPeriodService.create(req.body || {}, req.user);
    res.status(201).json({ success: true, message: 'Reporting period created successfully.', data });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const data = await reportingPeriodService.update(req.params.id, req.body || {}, req.user);
    res.json({ success: true, message: 'Reporting period updated successfully.', data });
  } catch (err) { next(err); }
}

async function setStatus(req, res, next) {
  try {
    const data = await reportingPeriodService.setStatus(req.params.id, req.body && req.body.status, req.user);
    res.json({ success: true, message: 'Reporting period status updated successfully.', data });
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, setStatus };
