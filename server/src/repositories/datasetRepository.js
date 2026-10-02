const { db } = require('../config/database');

async function list({ search, status } = {}) {
  let query = db('datasets').select('*').orderBy('name', 'asc');
  if (status) query = query.where('status', status);
  if (search) {
    query = query.where(function () {
      this.where('name', 'like', `%${search}%`).orWhere('code', 'like', `%${search}%`);
    });
  }
  return query;
}

async function findById(id) {
  return db('datasets').where({ id }).first();
}

async function findByCode(code) {
  return db('datasets').where({ code }).first();
}

async function create(data) {
  const [id] = await db('datasets').insert(data);
  return findById(id);
}

async function update(id, data) {
  await db('datasets').where({ id }).update(data);
  return findById(id);
}

module.exports = { list, findById, findByCode, create, update };
