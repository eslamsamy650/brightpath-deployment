const { connectDatabase, disconnectDatabase } = require('../lib/prisma');
const { logger } = require('./logger');

async function connectDatabaseWithLogging() {
  try {
    await connectDatabase();
    logger.info('PostgreSQL connected successfully');
  } catch (err) {
    logger.error('Failed to connect to PostgreSQL', {
      message: err instanceof Error ? err.message : String(err),
    });
    logger.error('Ensure PostgreSQL is running and DATABASE_URL is set correctly');
    throw err;
  }
}

module.exports = {
  connectDatabase: connectDatabaseWithLogging,
  disconnectDatabase,
};
