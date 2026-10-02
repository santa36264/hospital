const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { authRateLimiter } = require('../middleware/rateLimiter');
const environment = require('../config/environment');

const router = express.Router();

router.post('/login', authRateLimiter, authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refresh);
router.get('/me', requireAuth, authController.me);

// Development/test-only RBAC verification endpoints.
// Not registered in production.
if (environment.nodeEnv !== 'production') {
  router.get('/test/admin', requireAuth, requireRole('ADMIN'), (req, res) => {
    res.json({ success: true, message: 'Admin access granted.', data: {} });
  });
  router.get(
    '/test/data-entry',
    requireAuth,
    requireRole('DATA_ENTRY'),
    (req, res) => {
      res.json({ success: true, message: 'Data Entry access granted.', data: {} });
    }
  );
  router.get(
    '/test/reporting',
    requireAuth,
    requireRole('REPORTING'),
    (req, res) => {
      res.json({ success: true, message: 'Reporting access granted.', data: {} });
    }
  );
  router.get('/test/manager', requireAuth, requireRole('MANAGER'), (req, res) => {
    res.json({ success: true, message: 'Manager access granted.', data: {} });
  });
}

module.exports = router;
