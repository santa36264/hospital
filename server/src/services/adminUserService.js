const bcrypt = require('bcrypt');
const ApiError = require('../errors/ApiError');
const { db } = require('../config/database');
const adminUserRepository = require('../repositories/adminUserRepository');
const sessionRepository = require('../repositories/sessionRepository');
const auditLogRepository = require('../repositories/auditLogRepository');

const ROLES = ['ADMIN', 'DATA_ENTRY', 'REPORTING', 'MANAGER'];
const STATUSES = ['ACTIVE', 'INACTIVE'];
const MIN_PASSWORD_LENGTH = 12;

async function listUsers(filters) {
  const { items, total, page, pageSize } = await adminUserRepository.list(filters);
  return {
    items,
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

async function getUser(id) {
  const user = await adminUserRepository.findById(id);
  if (!user) throw new ApiError(404, 'User not found.');
  return user;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function assertValidPassword(password) {
  const { passwordError } = require('../utils/passwordPolicy');
  const err = passwordError(password);
  if (err) {
    throw new ApiError(422, 'Validation failed.', { password: err });
  }
}

async function createUser({ name, email, role, password }, actor) {
  const errors = {};
  if (!name || !String(name).trim()) errors.name = 'Name is required.';
  if (!email || !validateEmail(email)) errors.email = 'Valid email is required.';
  if (!ROLES.includes(role)) errors.role = 'Invalid role.';
  if (Object.keys(errors).length) throw new ApiError(422, 'Validation failed.', errors);
  assertValidPassword(password);

  const existing = await adminUserRepository.findByEmail(String(email).trim());
  if (existing) throw new ApiError(409, 'Email already exists.');

  const roleId = await adminUserRepository.roleIdFor(role);
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await adminUserRepository.create({
    name: String(name).trim(),
    email: String(email).trim(),
    passwordHash,
    roleId,
  });

  await auditLogRepository.log({
    userId: actor.id,
    action: 'USER_CREATED',
    resourceType: 'user',
    resourceId: user.id,
    newValues: { name: user.name, email: user.email, role: user.role },
  });
  return user;
}

async function updateUser(id, { name, email, role, status }, actor) {
  const user = await getUser(id);
  const errors = {};
  if (name !== undefined && !String(name).trim()) errors.name = 'Name is required.';
  if (email !== undefined && !validateEmail(email)) errors.email = 'Valid email is required.';
  if (role !== undefined && !ROLES.includes(role)) errors.role = 'Invalid role.';
  if (status !== undefined && !STATUSES.includes(status)) errors.status = 'Invalid status.';
  if (Object.keys(errors).length) throw new ApiError(422, 'Validation failed.', errors);

  const patch = {};

  if (role !== undefined && role !== user.role) {
    if (user.role === 'ADMIN' && user.status === 'ACTIVE' && role !== 'ADMIN') {
      const admins = await adminUserRepository.countActiveAdmins();
      if (admins <= 1) {
        throw new ApiError(409, 'At least one active administrator account must remain.');
      }
    }
    patch.role_id = await adminUserRepository.roleIdFor(role);
  }

  if (status !== undefined && status !== user.status) {
    if (status === 'INACTIVE' && user.role === 'ADMIN' && user.status === 'ACTIVE') {
      const admins = await adminUserRepository.countActiveAdmins();
      if (admins <= 1) {
        throw new ApiError(409, 'At least one active administrator account must remain.');
      }
    }
    patch.status = status;
  }

  if (email !== undefined && email !== user.email) {
    const existing = await adminUserRepository.findByEmail(String(email).trim());
    if (existing && existing.id !== user.id) throw new ApiError(409, 'Email already exists.');
    patch.email = String(email).trim();
  }

  if (name !== undefined) patch.name = String(name).trim();

  const updated = await adminUserRepository.update(id, patch);

  if (patch.role_id !== undefined && role !== user.role) {
    await auditLogRepository.log({
      userId: actor.id,
      action: 'USER_ROLE_CHANGED',
      resourceType: 'user',
      resourceId: id,
      oldValues: { role: user.role },
      newValues: { role },
    });
  }
  if (patch.status !== undefined) {
    if (status === 'INACTIVE') {
      // Deactivation + session revocation + audit must be atomic.
      await db.transaction(async (trx) => {
        await auditLogRepository.log({
          userId: actor.id,
          action: 'USER_DEACTIVATED',
          resourceType: 'user',
          resourceId: id,
          oldValues: { status: user.status },
          newValues: { status },
        }, trx);
        await sessionRepository.revokeAllByUser(id, trx);
      });
    } else {
      await auditLogRepository.log({
        userId: actor.id,
        action: 'USER_ACTIVATED',
        resourceType: 'user',
        resourceId: id,
        oldValues: { status: user.status },
        newValues: { status },
      });
    }
  }
  if (patch.name !== undefined || patch.email !== undefined) {
    await auditLogRepository.log({
      userId: actor.id,
      action: 'USER_UPDATED',
      resourceType: 'user',
      resourceId: id,
      oldValues: { name: user.name, email: user.email },
      newValues: { name: updated.name, email: updated.email },
    });
  }

  return updated;
}

async function setStatus(id, status, actor) {
  return updateUser(id, { status }, actor);
}

async function changePassword(id, newPassword, actor) {
  const user = await getUser(id);
  assertValidPassword(newPassword);

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.transaction(async (trx) => {
    await adminUserRepository.update(id, { password_hash: passwordHash }, trx);
    await sessionRepository.revokeAllByUser(id, trx);
    await auditLogRepository.log({
      userId: actor.id,
      action: 'USER_PASSWORD_CHANGED',
      resourceType: 'user',
      resourceId: id,
      metadata: { targetUserEmail: user.email },
    }, trx);
  });
  return { id: user.id };
}

module.exports = { listUsers, getUser, createUser, updateUser, setStatus, changePassword };
