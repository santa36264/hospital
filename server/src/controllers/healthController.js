const { checkDatabaseConnection } = require('../config/database');

async function healthCheck(req, res, next) {
  try {
    let database = 'ok';
    try {
      await checkDatabaseConnection();
    } catch {
      database = 'unavailable';
    }

    res.status(200).json({
      success: true,
      message: 'Hospital Health Data Management API is running.',
      data: {
        status: 'ok',
        database,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { healthCheck };
