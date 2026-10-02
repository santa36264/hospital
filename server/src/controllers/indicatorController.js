const indicatorService = require('../services/indicatorService');

async function list(req, res, next) {
  try {
    const data = await indicatorService.list({
      search: req.query.search,
      status: req.query.status,
      datasetId: req.query.dataset_id,
    });
    res.json({ success: true, message: 'Indicators retrieved successfully.', data });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const data = await indicatorService.getById(req.params.id);
    res.json({ success: true, message: 'Indicator retrieved successfully.', data });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = await indicatorService.create(req.body || {}, req.user);
    res.status(201).json({ success: true, message: 'Indicator created successfully.', data });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const data = await indicatorService.update(req.params.id, req.body || {}, req.user);
    res.json({ success: true, message: 'Indicator updated successfully.', data });
  } catch (err) { next(err); }
}

async function setStatus(req, res, next) {
  try {
    const data = await indicatorService.setStatus(req.params.id, req.body && req.body.status, req.user);
    res.json({ success: true, message: 'Indicator status updated successfully.', data });
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, setStatus };
