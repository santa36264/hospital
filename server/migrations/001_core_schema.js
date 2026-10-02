/**
 * Stage 03 core schema.
 * MySQL / MariaDB compatible.
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('roles', (table) => {
    table.increments('id').primary();
    table.string('name', 50).notNullable().unique();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('name', 150).notNullable();
    table.string('email', 150).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.integer('role_id').unsigned().notNullable();
    table.enum('status', ['ACTIVE', 'INACTIVE']).notNullable().defaultTo('ACTIVE');
    table.timestamps(true, true);

    table.foreign('role_id').references('roles.id');
  });

  await knex.schema.createTable('datasets', (table) => {
    table.increments('id').primary();
    table.string('name', 150).notNullable();
    table.string('code', 50).notNullable().unique();
    table.text('description').nullable();
    table.enum('status', ['ACTIVE', 'INACTIVE']).notNullable().defaultTo('ACTIVE');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('indicators', (table) => {
    table.increments('id').primary();
    table.integer('dataset_id').unsigned().notNullable();
    table.string('name', 150).notNullable();
    table.string('code', 50).notNullable();
    table.text('description').nullable();
    table
      .enum('data_type', ['numeric', 'decimal', 'text', 'date', 'yes/no', 'percentage'])
      .notNullable();
    table.boolean('required').notNullable().defaultTo(false);
    table.enum('status', ['ACTIVE', 'INACTIVE']).notNullable().defaultTo('ACTIVE');
    table.decimal('min_value', 18, 4).nullable();
    table.decimal('max_value', 18, 4).nullable();
    table.integer('precision').nullable();
    table.timestamps(true, true);

    table.unique(['dataset_id', 'code']);
    table.foreign('dataset_id').references('datasets.id');
  });

  await knex.schema.createTable('reporting_periods', (table) => {
    table.increments('id').primary();
    table.string('label', 100).notNullable();
    table.date('start_date').nullable();
    table.date('end_date').nullable();
    table.enum('status', ['OPEN', 'CLOSED']).notNullable().defaultTo('OPEN');
    table.timestamps(true, true);
  });

  await knex.schema.createTable('submissions', (table) => {
    table.increments('id').primary();
    table.integer('dataset_id').unsigned().notNullable();
    table.integer('reporting_period_id').unsigned().notNullable();
    table.integer('owner_user_id').unsigned().notNullable();
    table
      .enum('status', ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'RETURNED', 'APPROVED'])
      .notNullable()
      .defaultTo('DRAFT');
    table.timestamp('submitted_at').nullable();
    table.timestamp('reviewed_at').nullable();
    table.timestamp('approved_at').nullable();
    table.timestamp('returned_at').nullable();
    table.timestamps(true, true);

    // One submission per Dataset + Reporting Period.
    table.unique(['dataset_id', 'reporting_period_id']);
    table.foreign('dataset_id').references('datasets.id');
    table.foreign('reporting_period_id').references('reporting_periods.id');
    table.foreign('owner_user_id').references('users.id');
  });

  await knex.schema.createTable('data_values', (table) => {
    table.increments('id').primary();
    table.integer('submission_id').unsigned().notNullable();
    table.integer('indicator_id').unsigned().notNullable();
    table.text('value').nullable(); // serialized per indicator data type
    table.timestamps(true, true);

    table.unique(['submission_id', 'indicator_id']);
    table.foreign('submission_id').references('submissions.id');
    table.foreign('indicator_id').references('indicators.id');
  });

  await knex.schema.createTable('submission_history', (table) => {
    table.increments('id').primary();
    table.integer('submission_id').unsigned().notNullable();
    table.integer('user_id').unsigned().notNullable();
    table
      .enum('action', ['CREATED', 'SUBMITTED', 'REVIEW_STARTED', 'RETURNED', 'RESUBMITTED', 'APPROVED'])
      .notNullable();
    table.text('reason').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('submission_id').references('submissions.id');
    table.foreign('user_id').references('users.id');
  });

  await knex.schema.createTable('submission_amendments', (table) => {
    table.increments('id').primary();
    table.integer('submission_id').unsigned().notNullable();
    table.integer('amended_by_user_id').unsigned().notNullable();
    table.text('reason').notNullable();
    table.json('old_values').nullable();
    table.json('new_values').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('submission_id').references('submissions.id');
    table.foreign('amended_by_user_id').references('users.id');
  });

  await knex.schema.createTable('notifications', (table) => {
    table.increments('id').primary();
    table.integer('recipient_user_id').unsigned().notNullable();
    table.string('type', 50).notNullable();
    table.text('message').notNullable();
    table.enum('status', ['UNREAD', 'READ']).notNullable().defaultTo('UNREAD');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('read_at').nullable();

    table.foreign('recipient_user_id').references('users.id');
  });

  await knex.schema.createTable('audit_logs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().nullable();
    table.string('action', 100).notNullable();
    table.string('resource_type', 100).notNullable();
    table.string('resource_id', 100).nullable();
    table.json('old_values').nullable();
    table.json('new_values').nullable();
    table.json('metadata').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.foreign('user_id').references('users.id');
    table.index(['resource_type', 'resource_id']);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('audit_logs');
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('submission_amendments');
  await knex.schema.dropTableIfExists('submission_history');
  await knex.schema.dropTableIfExists('data_values');
  await knex.schema.dropTableIfExists('submissions');
  await knex.schema.dropTableIfExists('reporting_periods');
  await knex.schema.dropTableIfExists('indicators');
  await knex.schema.dropTableIfExists('datasets');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('roles');
};
