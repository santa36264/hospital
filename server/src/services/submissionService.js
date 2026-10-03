/**
 * Stage 06 — Submission Service
 *
 * Handles: create draft, save draft, submit, get, list-my.
 * Does NOT implement: UNDER_REVIEW, APPROVED, review/return by Reporting (Stage 07).
 */

const { db } = require('../config/database');
const ApiError = require('../errors/ApiError');
const submissionRepository = require('../repositories/submissionRepository');
const datasetRepository = require('../repositories/datasetRepository');
const reportingPeriodRepository = require('../repositories/reportingPeriodRepository');
const indicatorRepository = require('../repositories/indicatorRepository');
const auditLogRepository = require('../repositories/auditLogRepository');
const notificationService = require('./notificationService');

// Statuses that a DATA_ENTRY user may edit.
const EDITABLE_STATUSES = ['DRAFT', 'RETURNED'];
// Statuses that may transition to SUBMITTED.
const SUBMITTABLE_STATUSES = ['DRAFT', 'RETURNED'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Assert that the submission belongs to the requesting user.
 * Returns 404 (not 403) so we don't leak existence of other users' submissions.
 */
function assertOwnership(submission, userId) {
  if (!submission || submission.owner_user_id !== userId) {
    throw new ApiError(404, 'Submission not found.');
  }
}

/**
 * Validate a single indicator value against its configured rules.
 * Returns an error string, or null when valid.
 *
 * @param {object} indicator  – row from indicators table
 * @param {string|null} raw   – raw string value from the request
 * @param {boolean} forSubmit – true = required fields must be non-empty
 */
function validateIndicatorValue(indicator, raw, forSubmit) {
  const isEmpty = raw === null || raw === undefined || String(raw).trim() === '';

  // Required check only enforced on submit, not on save-draft.
  if (isEmpty) {
    if (forSubmit && indicator.required) {
      return `${indicator.name} is required.`;
    }
    return null; // empty is OK for draft or optional fields
  }

  const value = String(raw).trim();
  const type = indicator.data_type; // numeric | decimal | text | date | yes/no | percentage

  // ── Numeric / Decimal / Percentage ──────────────────────────────────────
  if (type === 'numeric' || type === 'decimal' || type === 'percentage') {
    const num = Number(value);
    if (isNaN(num)) {
      return `${indicator.name} must be a number.`;
    }

    if (type === 'numeric') {
      if (!Number.isInteger(num)) {
        return `${indicator.name} must be a whole number.`;
      }
    }

    if (type === 'percentage') {
      const min = indicator.min_value !== null && indicator.min_value !== undefined ? Number(indicator.min_value) : 0;
      const max = indicator.max_value !== null && indicator.max_value !== undefined ? Number(indicator.max_value) : 100;
      if (num < min || num > max) {
        return `${indicator.name} must be between ${min} and ${max}.`;
      }
    } else {
      // numeric / decimal — respect configured min/max
      if (indicator.min_value !== null && indicator.min_value !== undefined) {
        if (num < Number(indicator.min_value)) {
          return `${indicator.name} must be at least ${indicator.min_value}.`;
        }
      }
      if (indicator.max_value !== null && indicator.max_value !== undefined) {
        if (num > Number(indicator.max_value)) {
          return `${indicator.name} must be at most ${indicator.max_value}.`;
        }
      }
    }

    // Precision check for decimal / percentage
    if ((type === 'decimal' || type === 'percentage') && indicator.precision !== null && indicator.precision !== undefined) {
      const decimalStr = value.includes('.') ? value.split('.')[1] : '';
      if (decimalStr.length > Number(indicator.precision)) {
        return `${indicator.name} may have at most ${indicator.precision} decimal place(s).`;
      }
    }

    return null;
  }

  // ── Date ─────────────────────────────────────────────────────────────────
  if (type === 'date') {
    if (isNaN(Date.parse(value))) {
      return `${indicator.name} must be a valid date.`;
    }
    return null;
  }

  // ── yes/no ────────────────────────────────────────────────────────────────
  if (type === 'yes/no') {
    if (!['yes', 'no', 'true', 'false', '1', '0'].includes(value.toLowerCase())) {
      return `${indicator.name} must be Yes or No.`;
    }
    return null;
  }

  // ── Text — accept any non-empty string ───────────────────────────────────
  return null;
}

// ─── List (my submissions) ────────────────────────────────────────────────────

async function listMySubmissions(userId, filters = {}) {
  return submissionRepository.findByOwner(userId, filters);
}

// ─── Get one submission ───────────────────────────────────────────────────────

/**
 * Returns submission metadata + dataset indicators + current data values,
 * all in one payload ready for the frontend form.
 */
async function getSubmission(id, userId) {
  const submission = await submissionRepository.findById(id);
  assertOwnership(submission, userId);

  // Active indicators for the submission's dataset (presented for entry).
  // Inactive indicators: keep historical values but don't present as new fields.
  const allIndicators = await indicatorRepository.list({ datasetId: submission.dataset_id });
  const activeIndicators = allIndicators.filter((i) => i.status === 'ACTIVE');

  // Current values stored in data_values for this submission.
  const dataValues = await submissionRepository.getDataValues(id);
  const valuesMap = {};
  for (const dv of dataValues) {
    valuesMap[dv.indicator_id] = dv.value;
  }

  // Attach latest return reason (if any) so the DATA_ENTRY form can display it.
  let returnReason = null;
  if (submission.status === 'RETURNED') {
    const history = await submissionRepository.getHistory(id);
    const lastReturn = [...history].reverse().find(h => h.action === 'RETURNED');
    if (lastReturn) returnReason = lastReturn.reason;
  }

  return {
    submission: { ...submission, returnReason },
    indicators: activeIndicators,
    values: valuesMap,
  };
}

// ─── Create (new draft) ───────────────────────────────────────────────────────

async function createSubmission({ datasetId, reportingPeriodId }, user) {
  // 1. Verify dataset exists and is ACTIVE.
  const dataset = await datasetRepository.findById(datasetId);
  if (!dataset) throw new ApiError(422, 'Validation failed.', { dataset_id: 'Dataset not found.' });
  if (dataset.status !== 'ACTIVE') {
    throw new ApiError(422, 'Validation failed.', { dataset_id: 'Dataset is not active.' });
  }

  // 2. Verify reporting period exists and is OPEN.
  const period = await reportingPeriodRepository.findById(reportingPeriodId);
  if (!period) throw new ApiError(422, 'Validation failed.', { reporting_period_id: 'Reporting period not found.' });
  if (period.status !== 'OPEN') {
    throw new ApiError(422, 'Validation failed.', { reporting_period_id: 'Reporting period is not open.' });
  }

  // 3. Check duplicate.
  const existing = await submissionRepository.findByDatasetAndPeriod(datasetId, reportingPeriodId);
  if (existing) {
    throw new ApiError(409, 'A submission already exists for this dataset and reporting period.');
  }

  // 4. Create in transaction.
  const submission = await db.transaction(async (trx) => {
    const sub = await submissionRepository.create(trx, {
      dataset_id: datasetId,
      reporting_period_id: reportingPeriodId,
      owner_user_id: user.id,
      status: 'DRAFT',
    });

    await submissionRepository.addHistory(trx, sub.id, user.id, 'CREATED');

    await auditLogRepository.log({
      userId: user.id,
      action: 'SUBMISSION_CREATED',
      resourceType: 'submission',
      resourceId: sub.id,
      newValues: { dataset_id: datasetId, reporting_period_id: reportingPeriodId, status: 'DRAFT' },
    });

    return sub;
  });

  return submission;
}

// ─── Save Draft ───────────────────────────────────────────────────────────────

/**
 * values: Array<{ indicator_id: number, value: string|null }>
 */
async function saveDraft(submissionId, values, user) {
  // 1. Load submission.
  const submission = await submissionRepository.findById(submissionId);
  assertOwnership(submission, user.id);

  // 2. Must be in an editable status.
  if (!EDITABLE_STATUSES.includes(submission.status)) {
    throw new ApiError(409, `Submission cannot be edited in status "${submission.status}".`);
  }

  // 3. Period must still be OPEN.
  if (submission.period_status !== 'OPEN') {
    throw new ApiError(409, 'The reporting period is closed. This submission is read-only.');
  }

  // 4. Validate values (draft mode = partial is OK; only reject obviously invalid ones).
  const indicators = await indicatorRepository.list({ datasetId: submission.dataset_id, status: 'ACTIVE' });
  const indicatorMap = {};
  for (const ind of indicators) indicatorMap[ind.id] = ind;

  const errors = {};
  for (const v of values) {
    const indicator = indicatorMap[v.indicator_id];
    if (!indicator) {
      // Skip values for indicators that no longer exist / are inactive.
      continue;
    }
    const err = validateIndicatorValue(indicator, v.value, false); // false = draft, not submit
    if (err) errors[`indicator_${v.indicator_id}`] = err;
  }

  if (Object.keys(errors).length) {
    throw new ApiError(422, 'Validation failed.', errors);
  }

  // 5. Upsert values and touch updated_at in a transaction.
  await db.transaction(async (trx) => {
    await submissionRepository.upsertDataValues(trx, submissionId, values);
    await submissionRepository.update(trx, submissionId, {});
  });

  // 6. Audit.
  await auditLogRepository.log({
    userId: user.id,
    action: 'SUBMISSION_UPDATED',
    resourceType: 'submission',
    resourceId: submissionId,
    metadata: { valueCount: values.length },
  });

  // Return refreshed submission + indicators + values.
  return getSubmission(submissionId, user.id);
}

// ─── Submit ───────────────────────────────────────────────────────────────────

async function submitSubmission(submissionId, user) {
  // 1. Load submission.
  const submission = await submissionRepository.findById(submissionId);
  assertOwnership(submission, user.id);

  // 2. Status must be DRAFT or RETURNED.
  if (!SUBMITTABLE_STATUSES.includes(submission.status)) {
    throw new ApiError(409, `Cannot submit a submission in status "${submission.status}".`);
  }

  // 3. Period must be OPEN.
  if (submission.period_status !== 'OPEN') {
    throw new ApiError(409, 'The reporting period is closed. Submission is not allowed.');
  }

  // 4. Dataset must be ACTIVE (re-check at submit time).
  if (submission.dataset_status !== 'ACTIVE') {
    throw new ApiError(409, 'The dataset is no longer active. Submission is not allowed.');
  }

  // 5. Load active indicators and current values.
  const indicators = await indicatorRepository.list({ datasetId: submission.dataset_id, status: 'ACTIVE' });
  const dataValues = await submissionRepository.getDataValues(submissionId);
  const valuesMap = {};
  for (const dv of dataValues) valuesMap[dv.indicator_id] = dv.value;

  // 6. Full validation (forSubmit = true → required fields enforced).
  const errors = {};
  for (const ind of indicators) {
    const raw = valuesMap[ind.id] !== undefined ? valuesMap[ind.id] : null;
    const err = validateIndicatorValue(ind, raw, true);
    if (err) errors[`indicator_${ind.id}`] = err;
  }

  if (Object.keys(errors).length) {
    throw new ApiError(422, 'Submission validation failed.', errors);
  }

  // 7. Transition to SUBMITTED in a transaction.
  const previousStatus = submission.status;
  const historyAction = previousStatus === 'RETURNED' ? 'RESUBMITTED' : 'SUBMITTED';

  const updated = await db.transaction(async (trx) => {
    const sub = await submissionRepository.update(trx, submissionId, {
      status: 'SUBMITTED',
      submitted_at: db.fn.now(),
    });

    await submissionRepository.addHistory(trx, submissionId, user.id, historyAction);

    await auditLogRepository.log({
      userId: user.id,
      action: 'SUBMISSION_SUBMITTED',
      resourceType: 'submission',
      resourceId: submissionId,
      oldValues: { status: previousStatus },
      newValues: { status: 'SUBMITTED' },
    });

    await notificationService.notifySubmitted(trx, { submission, submitterName: user.name });

    return sub;
  });

  return updated;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  listMySubmissions,
  getSubmission,
  createSubmission,
  saveDraft,
  submitSubmission,
};
