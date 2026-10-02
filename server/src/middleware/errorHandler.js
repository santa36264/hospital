const environment = require('../config/environment');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;

  const body = {
    success: false,
    message:
      statusCode === 500 && environment.nodeEnv === 'production'
        ? 'Unexpected server error.'
        : err.message || 'Unexpected server error.',
  };

  if (err.errors) {
    body.errors = err.errors;
  }

  if (statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).json(body);
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: 'Resource not found.',
  });
}

module.exports = { errorHandler, notFoundHandler };
