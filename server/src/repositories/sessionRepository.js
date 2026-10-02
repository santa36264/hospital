const { db } = require('../config/database');

async function create({ userId, tokenHash, expiresAt, userAgent, ipAddress }) {
  const [id] = await db('refresh_sessions').insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    last_used_at: new Date(),
    user_agent: userAgent || null,
    ip_address: ipAddress || null,
  });
  return id;
}

async function findByTokenHash(tokenHash) {
  return db('refresh_sessions').where({ token_hash: tokenHash }).first();
}

async function findById(id) {
  return db('refresh_sessions').where({ id }).first();
}

async function revoke(id) {
  return db('refresh_sessions')
    .where({ id, revoked_at: null })
    .update({ revoked_at: new Date() });
}

async function touch(id) {
  return db('refresh_sessions')
    .where({ id })
    .update({ last_used_at: new Date() });
}

async function updateTokenHash(id, tokenHash) {
  return db('refresh_sessions')
    .where({ id })
    .update({ token_hash: tokenHash });
}

module.exports = { create, findByTokenHash, findById, revoke, touch, updateTokenHash };
