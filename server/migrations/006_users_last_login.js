/**
 * Stage 11: additive column for user administration "Last Login".
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dateTime('last_login_at').nullable();
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('last_login_at');
  });
};
