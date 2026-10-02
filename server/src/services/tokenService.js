const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const environment = require('../config/environment');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user, sessionId) {
  return jwt.sign(
    { sub: String(user.id), role: user.role, sid: String(sessionId) },
    environment.jwt.accessSecret,
    {
      expiresIn: environment.jwt.accessExpiresIn,
      jwtid: crypto.randomUUID(),
    }
  );
}

function signRefreshToken(user, sessionId) {
  return jwt.sign(
    { sub: String(user.id), sid: String(sessionId) },
    environment.jwt.refreshSecret,
    { expiresIn: environment.jwt.refreshExpiresIn }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, environment.jwt.accessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, environment.jwt.refreshSecret);
}

function refreshTokenExpiryDate() {
  const { durationToMs } = require('../utils/duration');
  return new Date(
    Date.now() +
      durationToMs(environment.jwt.refreshExpiresIn, 7 * 86400000)
  );
}

module.exports = {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  refreshTokenExpiryDate,
};
