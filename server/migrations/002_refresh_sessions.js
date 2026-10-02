/**
 * Stage 04: server-side refresh-session records.
 * Refresh tokens are stored hashed; raw tokens are never persisted.
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('refresh_sessions', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('token_hash', 64).notNullable().unique();
    table.dateTime('expires_at').notNullable();
    table.dateTime('revoked_at').nullable();
    table.dateTime('last_used_at').nullable();
    table.string('user_agent', 255).nullable();
    table.string('ip_address', 45).nullable();
    table.timestamps(true, true);

    table.foreign('user_id').references('users.id');
    table.index(['user_id', 'revoked_at']);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('refresh_sessions');
};
