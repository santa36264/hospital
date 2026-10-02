/**
 * Stage 08: report_history table.
 * Records each time a user generates / views a report.
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('report_history', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table
      .enum('report_type', [
        'DATASET_REPORT',
        'MONTHLY_REPORT',
        'INDICATOR_REPORT',
        'SUBMISSION_STATUS_REPORT',
      ])
      .notNullable();
    table.integer('dataset_id').unsigned().nullable();
    table.integer('reporting_period_id').unsigned().nullable();
    table.integer('indicator_id').unsigned().nullable();
    table.json('parameters').nullable(); // any extra filter params
    table.timestamp('accessed_at').defaultTo(knex.fn.now());

    table.foreign('user_id').references('users.id');
    // No FK on dataset_id / period_id / indicator_id — keep history even if config changes
    table.index(['user_id', 'accessed_at']);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('report_history');
};
