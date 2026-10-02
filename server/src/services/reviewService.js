/**
 * Stage 07 — Review Service
 *
 * Handles: start-review (SUBMITTED→UNDER_REVIEW),
 *          approve     (UNDER_REVIEW→APPROVED),
 *          return      (UNDER_REVIEW→RETURNED, mandatory reason).
 *
 * All operations require REPORTING role (enforced at route level).
 * State-transition rules are enforced here.
 * All multi-step DB operations run inside Knex transactions.
 */

const { db } = require('../config/database');
const ApiError = require('../errors/ApiError');
const submissionRepository = require('../repositories/submissionRepository');
const indicatorRepository = require('../repositories/indicatorRepository');
const auditLogRepository = require('../repositories/auditLogRepository');
const notificationService = require('./notificationService');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Load a submission and assert it exists.
 * Unlike DATA_ENTRY ownership check, Reporting can access any submission
 * that is in a reviewable state.
 */
async function loadSubmission(id) {
  const submission = await submissionRepository.findByIdWithOwner(id);
  if (!submission) throw new ApiError(404, 'Submission not found.');
  return submission;
}

// ─── List for review queue ────────────────────────────────────────────────────

async function listForReview(filters = {}) {
  return submissionRepository.findForReview(filters);
}

// ─── Get review detail ────────────────────────────────────────────────────────

/**
 * Returns: submission + all indicators (with stored values) + history.
 * Used by the Reporting review detail page.
 */
async function getReviewDetail(id) {
  const submission = await loadSubmission(id);

  // Only allow Reporting to view SUBMITTED, UNDER_REVIEW, RETURNED, APPROVED
  const viewableStatuses = ['SUBMITTED', 'UNDER_REVIEW', 'RETURNED', 'APPROVED'];
  if (!viewableStatuses.includes(submission.status)) {
    throw new ApiError(403, 'This submission is not available for review.');
  }

  // All indicators (active + inactive — reviewer sees the full picture)
  const allIndicators = await indicatorRepository.list({ datasetId: submission.dataset_id });

  // Current values
  const dataValues = await submissionRepository.getDataValues(id);
  const valuesMap = {};
  for (const dv of dataValues) valuesMap[dv.indicator_id] = dv.value;

  // Full history
  const history = await submissionRepository.getHistory(id);

  return { submission, indicators: allIndicators, values: valuesMap, history };
}

// ─── Start Review (SUBMITTED → UNDER_REVIEW) ─────────────────────────────────

async function startReview(submissionId, reviewer) {
  const submission = await loadSubmission(submissionId);

  if (submission.status !== 'SUBMITTED') {
    throw new ApiError(
      409,
      `Cannot start review on a submission with status "${submission.status}". Only SUBMITTED submissions can be reviewed.`
    );
  }

  const updated = await db.transaction(async (trx) => {
    const sub = await submissionRepository.update(trx, submissionId, {
      status: 'UNDER_REVIEW',
      reviewed_at: db.fn.now(),
    });

    await submissionRepository.addHistory(trx, submissionId, reviewer.id, 'REVIEW_STARTED');

    await auditLogRepository.log({
      userId: reviewer.id,
      action: 'SUBMISSION_REVIEW_STARTED',
      resourceType: 'submission',
      resourceId: submissionId,
      oldValues: { status: 'SUBMITTED' },
      newValues: { status: 'UNDER_REVIEW' },
    });

    // Notify the DATA_ENTRY owner
    await notificationService.notifyUnderReview(trx, {
      submission: sub,
      reviewerName: reviewer.name,
    });

    return sub;
  });

  return updated;
}

// ─── Approve (UNDER_REVIEW → APPROVED) ───────────────────────────────────────

async function approveSubmission(submissionId, reviewer) {
  const submission = await loadSubmission(submissionId);

  if (submission.status !== 'UNDER_REVIEW') {
    throw new ApiError(
      409,
      `Cannot approve a submission with status "${submission.status}". Only UNDER_REVIEW submissions can be approved.`
    );
  }

  const updated = await db.transaction(async (trx) => {
    const sub = await submissionRepository.update(trx, submissionId, {
      status: 'APPROVED',
      approved_at: db.fn.now(),
    });

    await submissionRepository.addHistory(trx, submissionId, reviewer.id, 'APPROVED');

    await auditLogRepository.log({
      userId: reviewer.id,
      action: 'SUBMISSION_APPROVED',
      resourceType: 'submission',
      resourceId: submissionId,
      oldValues: { status: 'UNDER_REVIEW' },
      newValues: { status: 'APPROVED' },
    });

    // Notify the DATA_ENTRY owner
    await notificationService.notifyApproved(trx, {
      submission: sub,
      reviewerName: reviewer.name,
    });

    return sub;
  });

  return updated;
}

// ─── Return (UNDER_REVIEW → RETURNED) ────────────────────────────────────────

async function returnSubmission(submissionId, reason, reviewer) {
  // Reason is mandatory.
  if (!reason || !String(reason).trim()) {
    throw new ApiError(422, 'Validation failed.', {
      reason: 'A return reason is required.',
    });
  }
  const trimmedReason = String(reason).trim();

  const submission = await loadSubmission(submissionId);

  if (submission.status !== 'UNDER_REVIEW') {
    throw new ApiError(
      409,
      `Cannot return a submission with status "${submission.status}". Only UNDER_REVIEW submissions can be returned.`
    );
  }

  const updated = await db.transaction(async (trx) => {
    const sub = await submissionRepository.update(trx, submissionId, {
      status: 'RETURNED',
      returned_at: db.fn.now(),
    });

    // History entry carries the mandatory return reason.
    await submissionRepository.addHistory(
      trx,
      submissionId,
      reviewer.id,
      'RETURNED',
      trimmedReason
    );

    await auditLogRepository.log({
      userId: reviewer.id,
      action: 'SUBMISSION_RETURNED',
      resourceType: 'submission',
      resourceId: submissionId,
      oldValues: { status: 'UNDER_REVIEW' },
      newValues: { status: 'RETURNED', reason: trimmedReason },
    });

    // Notify the DATA_ENTRY owner with the reason.
    await notificationService.notifyReturned(trx, {
      submission: sub,
      reviewerName: reviewer.name,
      reason: trimmedReason,
    });

    return sub;
  });

  return updated;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  listForReview,
  getReviewDetail,
  startReview,
  approveSubmission,
  returnSubmission,
};
