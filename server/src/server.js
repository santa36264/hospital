const app = require('./app');
const environment = require('./config/environment');
const { checkDatabaseConnection } = require('./config/database');

async function start() {
  try {
    await checkDatabaseConnection();
    console.log('Database connection established.');
  } catch (err) {
    console.error('Database connection failed:', err.message);
  }

  app.listen(environment.port, () => {
    console.log(`Server running on port ${environment.port}`);
  });
}

start();
