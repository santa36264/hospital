/**
 * Stage 07 — Notification Service
 *
 * Creates in-app notifications for workflow events.
 * All notification creation is fire-and-forget (errors are
 * logged but must not break the main workflow transaction).
 */

const notificationRepository = require('../repositories/notificationRepository');

const TYPES = {
  SUBMISSION_UNDER_REVIEW: 'SUBMISSION_UNDER_REVIEW',
  SUBMISSION_RETURNED: 'SUBMISSION_RETURNED',
  SUBMISSION_APPROVED: 'SUBMISSION_APPROVED',
  SUBMISSION_SUBMITTED: 'SUBMISSION_SUBMITTED',
};

/**
 * Notify the DATA_ENTRY owner that their submission is now under review.
 */
async function notifyUnderReview(trx, { submission, reviewerName }) {
  try {
    await notificationRepository.create(trx, {
      recipientUserId: submission.owner_user_id,
      type: TYPES.SUBMISSION_UNDER_REVIEW,
      message: `Your submission "${submission.dataset_name} — ${submission.period_label}" is now under review by ${reviewerName}.`,
    });
  } catch (err) {
    console.error('Notification write failed (notifyUnderReview):', err.message);
  }
}

/**
 * Notify the DATA_ENTRY owner that their submission has been returned.
 */
async function notifyReturned(trx, { submission, reviewerName, reason }) {
  try {
    await notificationRepository.create(trx, {
      recipientUserId: submission.owner_user_id,
      type: TYPES.SUBMISSION_RETURNED,
      message: `Your submission "${submission.dataset_name} — ${submission.period_label}" was returned by ${reviewerName}. Reason: ${reason}`,
    });
  } catch (err) {
    console.error('Notification write failed (notifyReturned):', err.message);
  }
}

/**
 * Notify the DATA_ENTRY owner that their submission has been approved.
 */
async function notifyApproved(trx, { submission, reviewerName }) {
  try {
    await notificationRepository.create(trx, {
      recipientUserId: submission.owner_user_id,
      type: TYPES.SUBMISSION_APPROVED,
      message: `Your submission "${submission.dataset_name} — ${submission.period_label}" has been approved by ${reviewerName}.`,
    });
  } catch (err) {
    console.error('Notification write failed (notifyApproved):', err.message);
  }
}

/**
 * Retrieve notifications for a user.
 */
async function listForUser(userId, options = {}) {
  return notificationRepository.listForUser(userId, options);
}

/**
 * Count unread notifications.
 */
async function countUnread(userId) {
  return notificationRepository.countUnread(userId);
}

/**
 * Mark one notification read (must belong to the user).
 */
async function markRead(id, userId) {
  return notificationRepository.markRead(id, userId);
}

/**
 * Mark all notifications read for a user.
 */
async function markAllRead(userId) {
  return notificationRepository.markAllRead(userId);
}

module.exports = {
  notifyUnderReview,
  notifyReturned,
  notifyApproved,
  listForUser,
  countUnread,
  markRead,
  markAllRead,
  TYPES,
};
