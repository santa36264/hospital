const ApiError = require('../errors/ApiError');
const indicatorRepository = require('../repositories/indicatorRepository');
const datasetRepository = require('../repositories/datasetRepository');
const auditLogRepository = require('../repositories/auditLogRepository');

const DATA_TYPES = ['numeric', 'decimal', 'text', 'date', 'yes/no', 'percentage'];
const NUMERIC_TYPES = ['numeric', 'decimal', 'percentage'];
const VALID_STATUSES = ['ACTIVE', 'INACTIVE'];

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase().replace(/\s+/g, '_');
}

async function list(filters) {
  return indicatorRepository.list(filters);
}

async function getById(id) {
  const indicator = await indicatorRepository.findById(id);
  if (!indicator) throw new ApiError(404, 'Indicator not found.');
  return indicator;
}

function validateConfig({ dataset_id, code, name, data_type, min_value, max_value, precision }, { requireAll = true } = {}) {
  const errors = {};
  if (requireAll || dataset_id !== undefined) {
    if (!dataset_id) errors.dataset_id = 'Dataset is required.';
  }
  if (requireAll || code !== undefined) {
    if (!code || !String(code).trim()) errors.code = 'Code is required.';
  }
  if (requireAll || name !== undefined) {
    if (!name || !String(name).trim()) errors.name = 'Name is required.';
  }
  if (requireAll || data_type !== undefined) {
    if (!DATA_TYPES.includes(data_type)) errors.data_type = 'Invalid data type.';
  }

  const isNumeric = NUMERIC_TYPES.includes(data_type);
  if (isNumeric) {
    if (min_value !== undefined && min_value !== null && min_value !== '' && isNaN(Number(min_value))) {
      errors.min_value = 'Minimum must be a number.';
    }
    if (max_value !== undefined && max_value !== null && max_value !== '' && isNaN(Number(max_value))) {
      errors.max_value = 'Maximum must be a number.';
    }
    if (
      min_value !== undefined && min_value !== null && min_value !== '' &&
      max_value !== undefined && max_value !== null && max_value !== '' &&
      !isNaN(Number(min_value)) && !isNaN(Number(max_value)) &&
      Number(min_value) > Number(max_value)
    ) {
      errors.max_value = 'Maximum must be greater than or equal to minimum.';
    }
    if (precision !== undefined && precision !== null && precision !== '') {
      const p = Number(precision);
      if (!Number.isInteger(p) || p < 0 || p > 10) {
        errors.precision = 'Precision must be an integer between 0 and 10.';
      }
    }
  }

  if (Object.keys(errors).length) throw new ApiError(422, 'Validation failed.', errors);
}

function buildConfigPayload(input) {
  const isNumeric = NUMERIC_TYPES.includes(input.data_type);
  const payload = {
    dataset_id: Number(input.dataset_id),
    code: normalizeCode(input.code),
    name: String(input.name).trim(),
    description: input.description ? String(input.description).trim() : null,
    data_type: input.data_type,
    required: Boolean(input.required),
    status: 'ACTIVE',
    min_value: null,
    max_value: null,
    precision: null,
  };

  if (isNumeric) {
    if (input.data_type === 'percentage') {
      payload.min_value =
        input.min_value !== undefined && input.min_value !== null && input.min_value !== ''
          ? Number(input.min_value)
          : 0;
      payload.max_value =
        input.max_value !== undefined && input.max_value !== null && input.max_value !== ''
          ? Number(input.max_value)
          : 100;
    } else {
      payload.min_value =
        input.min_value !== undefined && input.min_value !== null && input.min_value !== ''
          ? Number(input.min_value)
          : null;
      payload.max_value =
        input.max_value !== undefined && input.max_value !== null && input.max_value !== ''
          ? Number(input.max_value)
          : null;
    }
    payload.precision =
      input.precision !== undefined && input.precision !== null && input.precision !== ''
        ? Number(input.precision)
        : input.data_type === 'numeric'
          ? 0
          : null;
  }

  return payload;
}

async function create(input, user) {
  validateConfig(input);
  const dataset = await datasetRepository.findById(Number(input.dataset_id));
  if (!dataset) throw new ApiError(422, 'Validation failed.', { dataset_id: 'Dataset does not exist.' });

  const payload = buildConfigPayload(input);
  const existing = await indicatorRepository.findByDatasetAndCode(payload.dataset_id, payload.code);
  if (existing) throw new ApiError(409, 'Indicator code already exists in this dataset.');

  const indicator = await indicatorRepository.create(payload);
  await auditLogRepository.log({
    userId: user.id,
    action: 'INDICATOR_CREATED',
    resourceType: 'indicator',
    resourceId: indicator.id,
    newValues: { code: indicator.code, dataset_id: indicator.dataset_id, data_type: indicator.data_type },
  });
  return indicator;
}

async function update(id, input, user) {
  const indicator = await getById(id);

  const merged = { ...indicator, ...input };
  const errors = {};
  if (input.name !== undefined && !String(input.name).trim()) errors.name = 'Name is required.';
  if (input.code !== undefined && !String(input.code).trim()) errors.code = 'Code is required.';
  if (input.data_type !== undefined && !DATA_TYPES.includes(input.data_type)) errors.data_type = 'Invalid data type.';
  if (Object.keys(errors).length) throw new ApiError(422, 'Validation failed.', errors);

  validateConfig(merged, { requireAll: false });

  const patch = {};
  if (input.code !== undefined) {
    const normalizedCode = normalizeCode(input.code);
    const existing = await indicatorRepository.findByDatasetAndCode(indicator.dataset_id, normalizedCode);
    if (existing && existing.id !== indicator.id) {
      throw new ApiError(409, 'Indicator code already exists in this dataset.');
    }
    patch.code = normalizedCode;
  }
  if (input.name !== undefined) patch.name = String(input.name).trim();
  if (input.description !== undefined) patch.description = input.description ? String(input.description).trim() : null;
  if (input.required !== undefined) patch.required = Boolean(input.required);

  // If data_type changes, rebuild validation config for the new type.
  if (input.data_type !== undefined || input.min_value !== undefined || input.max_value !== undefined || input.precision !== undefined) {
    const rebuilt = buildConfigPayload({
      dataset_id: indicator.dataset_id,
      code: indicator.code,
      name: indicator.name,
      data_type: input.data_type !== undefined ? input.data_type : indicator.data_type,
      required: input.required !== undefined ? input.required : indicator.required,
      min_value: input.min_value !== undefined ? input.min_value : input.data_type !== undefined ? undefined : indicator.min_value,
      max_value: input.max_value !== undefined ? input.max_value : input.data_type !== undefined ? undefined : indicator.max_value,
      precision: input.precision !== undefined ? input.precision : input.data_type !== undefined ? undefined : indicator.precision,
    });
    patch.data_type = rebuilt.data_type;
    patch.min_value = rebuilt.min_value;
    patch.max_value = rebuilt.max_value;
    patch.precision = rebuilt.precision;
  }

  const updated = await indicatorRepository.update(id, patch);
  await auditLogRepository.log({
    userId: user.id,
    action: 'INDICATOR_UPDATED',
    resourceType: 'indicator',
    resourceId: id,
    oldValues: { code: indicator.code, name: indicator.name, data_type: indicator.data_type },
    newValues: { code: updated.code, name: updated.name, data_type: updated.data_type },
  });
  return updated;
}

async function setStatus(id, status, user) {
  if (!VALID_STATUSES.includes(status)) {
    throw new ApiError(422, 'Validation failed.', { status: 'Invalid status.' });
  }
  const indicator = await getById(id);
  const updated = await indicatorRepository.update(id, { status });
  await auditLogRepository.log({
    userId: user.id,
    action: status === 'ACTIVE' ? 'INDICATOR_ACTIVATED' : 'INDICATOR_DEACTIVATED',
    resourceType: 'indicator',
    resourceId: id,
    oldValues: { status: indicator.status },
    newValues: { status },
  });
  return updated;
}

module.exports = { list, getById, create, update, setStatus, DATA_TYPES };
