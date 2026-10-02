const datasetService = require('../services/datasetService');

async function list(req, res, next) {
  try {
    const data = await datasetService.list({
      search: req.query.search,
      status: req.query.status,
    });
    res.json({ success: true, message: 'Datasets retrieved successfully.', data });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const data = await datasetService.getById(req.params.id);
    res.json({ success: true, message: 'Dataset retrieved successfully.', data });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = await datasetService.create(req.body || {}, req.user);
    res.status(201).json({ success: true, message: 'Dataset created successfully.', data });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const data = await datasetService.update(req.params.id, req.body || {}, req.user);
    res.json({ success: true, message: 'Dataset updated successfully.', data });
  } catch (err) { next(err); }
}

async function setStatus(req, res, next) {
  try {
    const data = await datasetService.setStatus(req.params.id, req.body && req.body.status, req.user);
    res.json({ success: true, message: 'Dataset status updated successfully.', data });
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, setStatus };
