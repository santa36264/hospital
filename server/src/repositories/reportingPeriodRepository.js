const { db } = require('../config/database');

async function list({ search, status, periodType } = {}) {
  let query = db('reporting_periods').select('*').orderBy('start_date', 'desc');
  if (status) query = query.where('status', status);
  if (periodType) query = query.where('period_type', periodType);
  if (search) query = query.where('label', 'like', `%${search}%`);
  return query;
}

async function findById(id) {
  return db('reporting_periods').where({ id }).first();
}

async function create(data) {
  const [id] = await db('reporting_periods').insert(data);
  return findById(id);
}

async function update(id, data) {
  await db('reporting_periods').where({ id }).update(data);
  return findById(id);
}

module.exports = { list, findById, create, update };
