const { db } = require('../config/database');

async function list({ search, status, datasetId } = {}) {
  let query = db('indicators')
    .join('datasets', 'datasets.id', 'indicators.dataset_id')
    .select('indicators.*', 'datasets.name as dataset_name')
    .orderBy('indicators.name', 'asc');
  if (status) query = query.where('indicators.status', status);
  if (datasetId) query = query.where('indicators.dataset_id', datasetId);
  if (search) {
    query = query.where(function () {
      this.where('indicators.name', 'like', `%${search}%`).orWhere(
        'indicators.code',
        'like',
        `%${search}%`
      );
    });
  }
  return query;
}

async function findById(id) {
  return db('indicators')
    .join('datasets', 'datasets.id', 'indicators.dataset_id')
    .select('indicators.*', 'datasets.name as dataset_name')
    .where('indicators.id', id)
    .first();
}

async function findByDatasetAndCode(datasetId, code) {
  return db('indicators')
    .where({ dataset_id: datasetId, code })
    .first();
}

async function create(data) {
  const [id] = await db('indicators').insert(data);
  return findById(id);
}

async function update(id, data) {
  await db('indicators').where({ id }).update(data);
  return findById(id);
}

module.exports = { list, findById, findByDatasetAndCode, create, update };
