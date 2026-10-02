const { db } = require('../config/database');

/**
 * Create a notification for a user.
 */
async function create(trx, { recipientUserId, type, message }) {
  const conn = trx || db;
  await conn('notifications').insert({
    recipient_user_id: recipientUserId,
    type,
    message,
    status: 'UNREAD',
  });
}

/**
 * List notifications for a user, newest first.
 */
async function listForUser(userId, { unreadOnly = false } = {}) {
  let query = db('notifications')
    .where('recipient_user_id', userId)
    .orderBy('created_at', 'desc');
  if (unreadOnly) query = query.where('status', 'UNREAD');
  return query.select('*');
}

/**
 * Count unread notifications for a user.
 */
async function countUnread(userId) {
  const result = await db('notifications')
    .where({ recipient_user_id: userId, status: 'UNREAD' })
    .count('id as count')
    .first();
  return Number(result.count);
}

/**
 * Mark a single notification as read.
 */
async function markRead(id, userId) {
  const updated = await db('notifications')
    .where({ id, recipient_user_id: userId })
    .update({ status: 'READ', read_at: db.fn.now() });
  return updated > 0;
}

/**
 * Mark all unread notifications for a user as read.
 */
async function markAllRead(userId) {
  await db('notifications')
    .where({ recipient_user_id: userId, status: 'UNREAD' })
    .update({ status: 'READ', read_at: db.fn.now() });
}

module.exports = { create, listForUser, countUnread, markRead, markAllRead };
