const knex = require('knex');
const knexConfig = require('../../knexfile');
const environment = require('./environment');

const config =
  environment.nodeEnv === 'production'
    ? knexConfig.production
    : knexConfig.development;

const db = knex(config);

async function checkDatabaseConnection() {
  await db.raw('SELECT 1');
}

module.exports = { db, checkDatabaseConnection };
