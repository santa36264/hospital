const environment = require('../config/environment');
const { durationToMs } = require('../utils/duration');
const authService = require('../services/authService');

function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: environment.nodeEnv === 'production',
    sameSite: 'lax',
    maxAge: maxAgeMs,
    path: '/',
  };
}

function setAuthCookies(res, accessToken, refreshToken) {
  const accessMs = durationToMs(environment.jwt.accessExpiresIn, 15 * 60000);
  const refreshMs = durationToMs(
    environment.jwt.refreshExpiresIn,
    7 * 24 * 3600000
  );
  res.cookie('access_token', accessToken, cookieOptions(accessMs));
  res.cookie('refresh_token', refreshToken, cookieOptions(refreshMs));
}

function clearAuthCookies(res) {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    const result = await authService.login(email, password, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    setAuthCookies(res, result.accessToken, result.refreshToken);
    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: { user: result.user },
    });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies ? req.cookies.refresh_token : undefined;
    await authService.logout(refreshToken, { ip: req.ip });
    clearAuthCookies(res);
    res.status(200).json({
      success: true,
      message: 'Logout successful.',
      data: {},
    });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies ? req.cookies.refresh_token : undefined;
    const result = await authService.refresh(refreshToken, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    setAuthCookies(res, result.accessToken, result.refreshToken);
    res.status(200).json({
      success: true,
      message: 'Session refreshed successfully.',
      data: { user: result.user },
    });
  } catch (err) {
    clearAuthCookies(res);
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await authService.getMe(req.user.id);
    res.status(200).json({
      success: true,
      message: 'Authenticated user retrieved successfully.',
      data: user,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, logout, refresh, me };
