const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const datasetsRoutes = require('./datasetsRoutes');
const indicatorsRoutes = require('./indicatorsRoutes');
const reportingPeriodsRoutes = require('./reportingPeriodsRoutes');
const submissionsRoutes = require('./submissionsRoutes');
const reviewRoutes = require('./reviewRoutes');
const notificationRoutes = require('./notificationRoutes');

const router = express.Router();

router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/datasets', datasetsRoutes);
router.use('/indicators', indicatorsRoutes);
router.use('/reporting-periods', reportingPeriodsRoutes);
router.use('/submissions', submissionsRoutes);
router.use('/review', reviewRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
