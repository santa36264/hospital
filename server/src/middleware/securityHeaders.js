/**
 * Safe, dependency-free security headers for the Express API.
 * Applied application-wide. Does not change CORS or cookie behavior.
 */
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  // API responses should not be cached by shared caches.
  res.setHeader('Cache-Control', 'no-store');
  next();
}

module.exports = securityHeaders;
