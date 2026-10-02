const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const datasetsRoutes = require('./datasetsRoutes');
const indicatorsRoutes = require('./indicatorsRoutes');
const reportingPeriodsRoutes = require('./reportingPeriodsRoutes');

const router = express.Router();

router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/datasets', datasetsRoutes);
router.use('/indicators', indicatorsRoutes);
router.use('/reporting-periods', reportingPeriodsRoutes);

module.exports = router;
