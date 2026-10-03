const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const environment = require('./config/environment');
const apiRoutes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const securityHeaders = require('./middleware/securityHeaders');

const app = express();

app.use(
  cors({
    origin: environment.clientUrl,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(securityHeaders);

app.use('/api/v1', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
