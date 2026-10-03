const express = require('express');
const environment = require('../config/environment');
const { db, checkDatabaseConnection } = require('../config/database');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const pkg = require('../../package.json');

const router = express.Router();

router.use(requireAuth, requireRole('ADMIN'));

router.get('/overview', async (req, res, next) => {
  try {
    let database = 'ok';
    try {
      await checkDatabaseConnection();
    } catch {
      database = 'unavailable';
    }

    const [{ total: totalUsers }] = await db('users').count({ total: 'id' });
    const [{ total: activeUsers }] = await db('users').where('status', 'ACTIVE').count({ total: 'id' });
    const [{ total: activeDatasets }] = await db('datasets').where('status', 'ACTIVE').count({ total: 'id' });
    const [{ total: openPeriods }] = await db('reporting_periods').where('status', 'OPEN').count({ total: 'id' });

    const usersByRole = await db('users')
      .join('roles', 'roles.id', 'users.role_id')
      .select('roles.name as role')
      .count({ total: 'users.id' })
      .groupBy('roles.name');

    const recentActivity = await db('audit_logs')
      .select('id', 'action', 'resource_type', 'created_at')
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
      .limit(10);

    res.json({
      success: true,
      message: 'System overview retrieved successfully.',
      data: {
        application: 'Hospital Health Data Management, Reporting and Analysis System',
        apiVersion: 'v1',
        environment: environment.nodeEnv,
        database,
        version: pkg.version,
        counts: {
          totalUsers: Number(totalUsers),
          activeUsers: Number(activeUsers),
          activeDatasets: Number(activeDatasets),
          openPeriods: Number(openPeriods),
        },
        usersByRole,
        recentActivity,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
