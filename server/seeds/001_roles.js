/**
 * DEVELOPMENT TEST DATA ONLY.
 * Seeds the four primary roles. No real hospital data.
 */
exports.seed = async function seed(knex) {
  await knex('roles').del();
  await knex('roles').insert([
    { name: 'ADMIN' },
    { name: 'DATA_ENTRY' },
    { name: 'REPORTING' },
    { name: 'MANAGER' },
  ]);
};
