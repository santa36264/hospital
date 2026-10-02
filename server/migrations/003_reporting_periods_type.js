/**
 * Stage 05: add period_type to reporting_periods.
 * Additive change only; no existing data is altered or removed.
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable('reporting_periods', (table) => {
    table
      .enum('period_type', ['MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'])
      .notNullable()
      .defaultTo('MONTHLY');
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('reporting_periods', (table) => {
    table.dropColumn('period_type');
  });
};
