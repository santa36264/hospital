const bcrypt = require('bcrypt');
const ApiError = require('../errors/ApiError');
const environment = require('../config/environment');
const userRepository = require('../repositories/userRepository');
const sessionRepository = require('../repositories/sessionRepository');
const auditLogRepository = require('../repositories/auditLogRepository');
const tokenService = require('./tokenService');
const crypto = require('crypto');

const GENERIC_AUTH_ERROR = 'Invalid email or password.';

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

function isSessionActive(session) {
  if (!session || session.revoked_at) return false;
  if (new Date(session.expires_at).getTime() <= Date.now()) return false;
  const lastUsed = session.last_used_at
    ? new Date(session.last_used_at).getTime()
    : new Date(session.created_at).getTime();
  const inactiveMs = Date.now() - lastUsed;
  if (inactiveMs > environment.session.inactivityTimeoutMinutes * 60000) {
    return false;
  }
  return true;
}

async function login(email, password, meta = {}) {
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required.', {
      email: !email ? 'Email is required.' : undefined,
      password: !password ? 'Password is required.' : undefined,
    });
  }

  const user = await userRepository.findByEmail(email);

  if (!user) {
    await auditLogRepository.log({
      action: 'LOGIN_FAILED',
      resourceType: 'auth',
      metadata: { reason: 'unknown_email', ip: meta.ip },
    });
    throw new ApiError(401, GENERIC_AUTH_ERROR);
  }

  if (user.status !== 'ACTIVE') {
    await auditLogRepository.log({
      userId: user.id,
      action: 'LOGIN_BLOCKED_INACTIVE',
      resourceType: 'auth',
      metadata: { ip: meta.ip },
    });
    throw new ApiError(401, GENERIC_AUTH_ERROR);
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    await auditLogRepository.log({
      userId: user.id,
      action: 'LOGIN_FAILED',
      resourceType: 'auth',
      metadata: { reason: 'bad_password', ip: meta.ip },
    });
    throw new ApiError(401, GENERIC_AUTH_ERROR);
  }

  // Create a placeholder refresh token after we know the session id.
  const expiresAt = tokenService.refreshTokenExpiryDate();
  const sessionId = await sessionRepository.create({
    userId: user.id,
    tokenHash: crypto.randomBytes(16).toString('hex'),
    expiresAt,
    userAgent: meta.userAgent,
    ipAddress: meta.ip,
  });

  const refreshToken = tokenService.signRefreshToken(user, sessionId);
  await sessionRepository.updateTokenHash(
    sessionId,
    tokenService.hashToken(refreshToken)
  );

  const accessToken = tokenService.signAccessToken(user, sessionId);

  await auditLogRepository.log({
    userId: user.id,
    action: 'LOGIN_SUCCESS',
    resourceType: 'auth',
    metadata: { ip: meta.ip },
  });

  return { user: safeUser(user), accessToken, refreshToken, sessionId };
}

async function refresh(refreshToken, meta = {}) {
  if (!refreshToken) {
    throw new ApiError(401, 'Refresh token is required.');
  }

  let payload;
  try {
    payload = tokenService.verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, 'Invalid or expired refresh token.');
  }

  const session = await sessionRepository.findByTokenHash(
    tokenService.hashToken(refreshToken)
  );

  if (!session || String(session.id) !== String(payload.sid)) {
    throw new ApiError(401, 'Invalid refresh session.');
  }

  if (session.revoked_at) {
    throw new ApiError(401, 'Refresh session has been revoked.');
  }

  if (!isSessionActive(session)) {
    await sessionRepository.revoke(session.id);
    throw new ApiError(401, 'Session expired due to inactivity or expiration.');
  }

  const user = await userRepository.findById(session.user_id);
  if (!user || user.status !== 'ACTIVE') {
    await sessionRepository.revoke(session.id);
    throw new ApiError(401, 'Account is not active.');
  }

  // Rotate: revoke old session, create new one.
  await sessionRepository.revoke(session.id);
  const expiresAt = tokenService.refreshTokenExpiryDate();
  const newSessionId = await sessionRepository.create({
    userId: user.id,
    tokenHash: crypto.randomBytes(16).toString('hex'),
    expiresAt,
    userAgent: meta.userAgent,
    ipAddress: meta.ip,
  });
  const newRefreshToken = tokenService.signRefreshToken(user, newSessionId);
  await sessionRepository.updateTokenHash(
    newSessionId,
    tokenService.hashToken(newRefreshToken)
  );

  const newAccessToken = tokenService.signAccessToken(user, newSessionId);

  await auditLogRepository.log({
    userId: user.id,
    action: 'SESSION_REFRESHED',
    resourceType: 'auth',
    metadata: { ip: meta.ip },
  });

  return {
    user: safeUser(user),
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    sessionId: newSessionId,
  };
}

async function logout(refreshToken, meta = {}) {
  if (refreshToken) {
    const session = await sessionRepository.findByTokenHash(
      tokenService.hashToken(refreshToken)
    );
    if (session) {
      await sessionRepository.revoke(session.id);
      await auditLogRepository.log({
        userId: session.user_id,
        action: 'LOGOUT',
        resourceType: 'auth',
        metadata: { ip: meta.ip },
      });
    }
  }
}

async function getMe(userId) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found.');
  }
  return safeUser(user);
}

module.exports = { login, refresh, logout, getMe, isSessionActive, safeUser };
