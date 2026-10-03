const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const datasetsRoutes = require('./datasetsRoutes');
const indicatorsRoutes = require('./indicatorsRoutes');
const reportingPeriodsRoutes = require('./reportingPeriodsRoutes');
const adminUserRoutes = require('./adminUserRoutes');
const adminAuditRoutes = require('./adminAuditRoutes');
const adminSystemRoutes = require('./adminSystemRoutes');
const submissionsRoutes = require('./submissionsRoutes');
const reviewRoutes = require('./reviewRoutes');
const notificationRoutes = require('./notificationRoutes');
const reportRoutes = require('./reportRoutes');
const analyticsRoutes = require('./analyticsRoutes');

const router = express.Router();

router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/datasets', datasetsRoutes);
router.use('/indicators', indicatorsRoutes);
router.use('/reporting-periods', reportingPeriodsRoutes);
router.use('/admin/users', adminUserRoutes);
router.use('/admin/audit-logs', adminAuditRoutes);
router.use('/admin/system', adminSystemRoutes);
router.use('/submissions', submissionsRoutes);
router.use('/review', reviewRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
