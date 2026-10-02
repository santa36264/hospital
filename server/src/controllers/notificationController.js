/**
 * Stage 07 — Notification Controller
 */

const notificationService = require('../services/notificationService');

async function list(req, res, next) {
  try {
    const unreadOnly = req.query.unread === 'true';
    const data = await notificationService.listForUser(req.user.id, { unreadOnly });
    res.json({ success: true, message: 'Notifications retrieved.', data });
  } catch (err) {
    next(err);
  }
}

async function unreadCount(req, res, next) {
  try {
    const count = await notificationService.countUnread(req.user.id);
    res.json({ success: true, message: 'Unread count retrieved.', data: { count } });
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const ok = await notificationService.markRead(Number(req.params.id), req.user.id);
    if (!ok) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    await notificationService.markAllRead(req.user.id);
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, unreadCount, markRead, markAllRead };
