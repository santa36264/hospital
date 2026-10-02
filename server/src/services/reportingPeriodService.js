const ApiError = require('../errors/ApiError');
const reportingPeriodRepository = require('../repositories/reportingPeriodRepository');
const auditLogRepository = require('../repositories/auditLogRepository');

const PERIOD_TYPES = ['MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM'];

async function list(filters) {
  return reportingPeriodRepository.list(filters);
}

async function getById(id) {
  const period = await reportingPeriodRepository.findById(id);
  if (!period) throw new ApiError(404, 'Reporting period not found.');
  return period;
}

function validateDates(startDate, endDate) {
  const errors = {};
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (!startDate) errors.start_date = 'Start date is required.';
  else if (isNaN(start.getTime())) errors.start_date = 'Invalid start date.';
  if (!endDate) errors.end_date = 'End date is required.';
  else if (isNaN(end.getTime())) errors.end_date = 'Invalid end date.';
  if (!errors.start_date && !errors.end_date && end < start) {
    errors.end_date = 'End date must not be before start date.';
  }
  if (Object.keys(errors).length) throw new ApiError(422, 'Validation failed.', errors);
}

async function create({ label, period_type, start_date, end_date }, user) {
  const errors = {};
  if (!period_type) errors.period_type = 'Period type is required.';
  else if (!PERIOD_TYPES.includes(period_type)) errors.period_type = 'Invalid period type.';
  if (!label || !String(label).trim()) errors.label = 'Label is required.';
  if (Object.keys(errors).length) throw new ApiError(422, 'Validation failed.', errors);
  validateDates(start_date, end_date);

  const period = await reportingPeriodRepository.create({
    label: String(label).trim(),
    period_type,
    start_date,
    end_date,
    status: 'OPEN',
  });

  await auditLogRepository.log({
    userId: user.id,
    action: 'REPORTING_PERIOD_CREATED',
    resourceType: 'reporting_period',
    resourceId: period.id,
    newValues: { label: period.label, period_type, start_date, end_date },
  });
  return period;
}

async function update(id, { label, start_date, end_date }, user) {
  const period = await getById(id);
  const errors = {};
  if (label !== undefined && !String(label).trim()) errors.label = 'Label is required.';
  if (Object.keys(errors).length) throw new ApiError(422, 'Validation failed.', errors);

  const newStart = start_date !== undefined ? start_date : period.start_date;
  const newEnd = end_date !== undefined ? end_date : period.end_date;
  validateDates(newStart, newEnd);

  const patch = {};
  if (label !== undefined) patch.label = String(label).trim();
  if (start_date !== undefined) patch.start_date = start_date;
  if (end_date !== undefined) patch.end_date = end_date;

  const updated = await reportingPeriodRepository.update(id, patch);
  await auditLogRepository.log({
    userId: user.id,
    action: 'REPORTING_PERIOD_UPDATED',
    resourceType: 'reporting_period',
    resourceId: id,
    oldValues: { label: period.label, start_date: period.start_date, end_date: period.end_date },
    newValues: { label: updated.label, start_date: updated.start_date, end_date: updated.end_date },
  });
  return updated;
}

async function setStatus(id, status, user) {
  const period = await getById(id);
  if (status !== 'OPEN' && status !== 'CLOSED') {
    throw new ApiError(422, 'Validation failed.', { status: 'Invalid status.' });
  }
  // Ordinary lifecycle: OPEN -> CLOSED. Reopening a closed period is not
  // allowed through ordinary operation (Stage 05 scope).
  if (period.status === 'CLOSED' && status === 'OPEN') {
    throw new ApiError(409, 'Closed periods cannot be reopened through ordinary operation.');
  }
  if (period.status === status) {
    return period;
  }
  const updated = await reportingPeriodRepository.update(id, { status });
  await auditLogRepository.log({
    userId: user.id,
    action: status === 'OPEN' ? 'REPORTING_PERIOD_OPENED' : 'REPORTING_PERIOD_CLOSED',
    resourceType: 'reporting_period',
    resourceId: id,
    oldValues: { status: period.status },
    newValues: { status },
  });
  return updated;
}

module.exports = { list, getById, create, update, setStatus, PERIOD_TYPES };
