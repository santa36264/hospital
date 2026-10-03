/**
 * Stage 09: add CUSTOM_REPORT to report_history.report_type enum.
 * MySQL ALTER TABLE MODIFY COLUMN to extend the ENUM.
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable('report_history', (table) => {
    table
      .enum('report_type', [
        'DATASET_REPORT',
        'MONTHLY_REPORT',
        'INDICATOR_REPORT',
        'SUBMISSION_STATUS_REPORT',
        'CUSTOM_REPORT',
      ])
      .notNullable()
      .alter();
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('report_history', (table) => {
    table
      .enum('report_type', [
        'DATASET_REPORT',
        'MONTHLY_REPORT',
        'INDICATOR_REPORT',
        'SUBMISSION_STATUS_REPORT',
      ])
      .notNullable()
      .alter();
  });
};
