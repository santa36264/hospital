const { db } = require('../config/database');

async function findByEmail(email) {
  return db('users')
    .join('roles', 'roles.id', 'users.role_id')
    .select(
      'users.id',
      'users.name',
      'users.email',
      'users.password_hash',
      'users.status',
      'roles.name as role'
    )
    .where('users.email', email)
    .first();
}

async function findById(id) {
  return db('users')
    .join('roles', 'roles.id', 'users.role_id')
    .select(
      'users.id',
      'users.name',
      'users.email',
      'users.status',
      'roles.name as role'
    )
    .where('users.id', id)
    .first();
}

module.exports = { findByEmail, findById };
