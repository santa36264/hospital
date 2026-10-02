const bcrypt = require('bcrypt');

/**
 * DEVELOPMENT TEST DATA ONLY.
 * One user per primary role. Safe development credentials:
 *   admin@dev.local / DevAdmin123!
 *   dataentry@dev.local / DevData123!
 *   reporting@dev.local / DevReport123!
 *   manager@dev.local / DevManager123!
 * Never present as real hospital staff; do not use in production.
 */
exports.seed = async function seed(knex) {
  const roles = await knex('roles').select('id', 'name');
  const roleId = (name) => roles.find((r) => r.name === name).id;

  const users = [
    { name: 'Development Admin', email: 'admin@dev.local', role: 'ADMIN', password: 'DevAdmin123!' },
    { name: 'Development Data Entry', email: 'dataentry@dev.local', role: 'DATA_ENTRY', password: 'DevData123!' },
    { name: 'Development Reporting', email: 'reporting@dev.local', role: 'REPORTING', password: 'DevReport123!' },
    { name: 'Development Manager', email: 'manager@dev.local', role: 'MANAGER', password: 'DevManager123!' },
  ];

  for (const u of users) {
    const existing = await knex('users').where({ email: u.email }).first();
    if (!existing) {
      await knex('users').insert({
        name: u.name,
        email: u.email,
        password_hash: await bcrypt.hash(u.password, 10),
        role_id: roleId(u.role),
        status: 'ACTIVE',
      });
    }
  }
};
