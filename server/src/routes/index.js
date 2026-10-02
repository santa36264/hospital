const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const datasetsRoutes = require('./datasetsRoutes');
const indicatorsRoutes = require('./indicatorsRoutes');
const reportingPeriodsRoutes = require('./reportingPeriodsRoutes');
const submissionsRoutes = require('./submissionsRoutes');

const router = express.Router();

router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/datasets', datasetsRoutes);
router.use('/indicators', indicatorsRoutes);
router.use('/reporting-periods', reportingPeriodsRoutes);
router.use('/submissions', submissionsRoutes);

module.exports = router;
