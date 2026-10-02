/**
 * Stage 07 — Review Controller
 * HTTP layer only; all business logic lives in reviewService.
 */

const reviewService = require('../services/reviewService');

async function listQueue(req, res, next) {
  try {
    const data = await reviewService.listForReview({
      status: req.query.status || undefined,
      datasetId: req.query.dataset_id ? Number(req.query.dataset_id) : undefined,
      reportingPeriodId: req.query.reporting_period_id
        ? Number(req.query.reporting_period_id)
        : undefined,
      search: req.query.search || undefined,
    });
    res.json({ success: true, message: 'Submission queue retrieved.', data });
  } catch (err) {
    next(err);
  }
}

async function getDetail(req, res, next) {
  try {
    const data = await reviewService.getReviewDetail(Number(req.params.id));
    res.json({ success: true, message: 'Submission detail retrieved.', data });
  } catch (err) {
    next(err);
  }
}

async function startReview(req, res, next) {
  try {
    const data = await reviewService.startReview(Number(req.params.id), req.user);
    res.json({ success: true, message: 'Review started. Status is now UNDER_REVIEW.', data });
  } catch (err) {
    next(err);
  }
}

async function approve(req, res, next) {
  try {
    const data = await reviewService.approveSubmission(Number(req.params.id), req.user);
    res.json({ success: true, message: 'Submission approved.', data });
  } catch (err) {
    next(err);
  }
}

async function returnSubmission(req, res, next) {
  try {
    const reason = req.body?.reason;
    const data = await reviewService.returnSubmission(
      Number(req.params.id),
      reason,
      req.user
    );
    res.json({ success: true, message: 'Submission returned for correction.', data });
  } catch (err) {
    next(err);
  }
}

module.exports = { listQueue, getDetail, startReview, approve, returnSubmission };
