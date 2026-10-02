const ApiError = require('../errors/ApiError');
const environment = require('../config/environment');
const tokenService = require('../services/tokenService');
const sessionRepository = require('../repositories/sessionRepository');
const userRepository = require('../repositories/userRepository');
const authService = require('../services/authService');

async function requireAuth(req, res, next) {
  try {
    const token = req.cookies && req.cookies.access_token;
    if (!token) {
      throw new ApiError(401, 'Authentication required.');
    }

    let payload;
    try {
      payload = tokenService.verifyAccessToken(token);
    } catch {
      throw new ApiError(401, 'Invalid or expired access token.');
    }

    const session = await sessionRepository.findById(payload.sid);
    if (!authService.isSessionActive(session)) {
      if (session) await sessionRepository.revoke(session.id);
      throw new ApiError(401, 'Session expired or invalid.');
    }

    const user = await userRepository.findById(payload.sub);
    if (!user || user.status !== 'ACTIVE') {
      throw new ApiError(401, 'Account is not active.');
    }

    await sessionRepository.touch(session.id);
    req.user = { ...user, sessionId: session.id };
    next();
  } catch (err) {
    next(err);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required.'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You are not authorized for this resource.'));
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
