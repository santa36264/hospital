const ApiError = require('../errors/ApiError');
const datasetRepository = require('../repositories/datasetRepository');
const auditLogRepository = require('../repositories/auditLogRepository');

const VALID_STATUSES = ['ACTIVE', 'INACTIVE'];

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, '_');
}

async function list(filters) {
  return datasetRepository.list(filters);
}

async function getById(id) {
  const dataset = await datasetRepository.findById(id);
  if (!dataset) throw new ApiError(404, 'Dataset not found.');
  return dataset;
}

function validatePayload({ code, name, description }, { requireAll = true } = {}) {
  const errors = {};
  if (requireAll || code !== undefined) {
    if (!code || !String(code).trim()) errors.code = 'Code is required.';
  }
  if (requireAll || name !== undefined) {
    if (!name || !String(name).trim()) errors.name = 'Name is required.';
  }
  if (description !== undefined && description !== null && typeof description !== 'string') {
    errors.description = 'Description must be a string.';
  }
  if (Object.keys(errors).length) {
    throw new ApiError(422, 'Validation failed.', errors);
  }
}

async function create({ code, name, description }, user) {
  validatePayload({ code, name, description });
  const normalizedCode = normalizeCode(code);
  const existing = await datasetRepository.findByCode(normalizedCode);
  if (existing) throw new ApiError(409, 'Dataset code already exists.');

  const dataset = await datasetRepository.create({
    code: normalizedCode,
    name: String(name).trim(),
    description: description ? String(description).trim() : null,
    status: 'ACTIVE',
  });

  await auditLogRepository.log({
    userId: user.id,
    action: 'DATASET_CREATED',
    resourceType: 'dataset',
    resourceId: dataset.id,
    newValues: { code: dataset.code, name: dataset.name },
  });
  return dataset;
}

async function update(id, { code, name, description }, user) {
  const dataset = await getById(id);
  const errors = {};
  if (name !== undefined && !String(name).trim()) errors.name = 'Name is required.';
  if (code !== undefined && !String(code).trim()) errors.code = 'Code is required.';
  if (Object.keys(errors).length) throw new ApiError(422, 'Validation failed.', errors);

  const patch = {};
  if (name !== undefined) patch.name = String(name).trim();
  if (description !== undefined) patch.description = description ? String(description).trim() : null;
  if (code !== undefined) {
    const normalizedCode = normalizeCode(code);
    const existing = await datasetRepository.findByCode(normalizedCode);
    if (existing && existing.id !== dataset.id) {
      throw new ApiError(409, 'Dataset code already exists.');
    }
    patch.code = normalizedCode;
  }

  const updated = await datasetRepository.update(id, patch);
  await auditLogRepository.log({
    userId: user.id,
    action: 'DATASET_UPDATED',
    resourceType: 'dataset',
    resourceId: id,
    oldValues: { code: dataset.code, name: dataset.name },
    newValues: { code: updated.code, name: updated.name },
  });
  return updated;
}

async function setStatus(id, status, user) {
  if (!VALID_STATUSES.includes(status)) {
    throw new ApiError(422, 'Validation failed.', { status: 'Invalid status.' });
  }
  const dataset = await getById(id);
  const updated = await datasetRepository.update(id, { status });
  await auditLogRepository.log({
    userId: user.id,
    action: status === 'ACTIVE' ? 'DATASET_ACTIVATED' : 'DATASET_DEACTIVATED',
    resourceType: 'dataset',
    resourceId: id,
    oldValues: { status: dataset.status },
    newValues: { status },
  });
  return updated;
}

module.exports = { list, getById, create, update, setStatus };
