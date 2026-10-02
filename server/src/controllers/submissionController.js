/**
 * Stage 06 — Submission Controller
 * Handles HTTP concerns only; delegates all business logic to submissionService.
 */

const submissionService = require('../services/submissionService');

async function listMy(req, res, next) {
  try {
    const data = await submissionService.listMySubmissions(req.user.id, {
      status: req.query.status || undefined,
      datasetId: req.query.dataset_id ? Number(req.query.dataset_id) : undefined,
      reportingPeriodId: req.query.reporting_period_id
        ? Number(req.query.reporting_period_id)
        : undefined,
    });
    res.json({ success: true, message: 'Submissions retrieved successfully.', data });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const data = await submissionService.getSubmission(
      Number(req.params.id),
      req.user.id
    );
    res.json({ success: true, message: 'Submission retrieved successfully.', data });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { dataset_id, reporting_period_id } = req.body || {};
    const data = await submissionService.createSubmission(
      {
        datasetId: Number(dataset_id),
        reportingPeriodId: Number(reporting_period_id),
      },
      req.user
    );
    res.status(201).json({ success: true, message: 'Submission created successfully.', data });
  } catch (err) {
    next(err);
  }
}

async function saveDraft(req, res, next) {
  try {
    // values: [{ indicator_id, value }, ...]
    const values = Array.isArray(req.body?.values) ? req.body.values : [];
    const data = await submissionService.saveDraft(
      Number(req.params.id),
      values,
      req.user
    );
    res.json({ success: true, message: 'Draft saved successfully.', data });
  } catch (err) {
    next(err);
  }
}

async function submit(req, res, next) {
  try {
    const data = await submissionService.submitSubmission(
      Number(req.params.id),
      req.user
    );
    res.json({ success: true, message: 'Submission submitted successfully.', data });
  } catch (err) {
    next(err);
  }
}

module.exports = { listMy, getById, create, saveDraft, submit };
