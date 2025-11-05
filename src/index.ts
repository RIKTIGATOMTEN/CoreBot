import { db, initDatabases } from './core/database/db.js';
import { ErrorHandler } from './core/handlers/errors/main.js';
import { logger } from './core/export/logger.js';
import { validateEnvironmentVariables } from './core/config/environment.js';
import { setupBot } from './core/setup/setup.js';

async function main(): Promise<void> {
  const startTime = performance.now();
  
  try {
    logger.info('Starting RiktigaTomten\'s Core...');

    const missingVars = validateEnvironmentVariables();
    if (missingVars.length > 0) {
      logger.error(`❌  Missing required environment variables: ${missingVars.join(', ')}`);
      logger.error('💡 Please check your .env file in the config directory');
      process.exit(1);
    }

    logger.info('Initializing database connections...');
    await initDatabases(db);
    logger.success('Database connections established');

    const client = await setupBot();

    logger.info('🔐 Connecting to Discord...');
    await client.login(process.env.TOKEN);
    
    const totalTime = Math.round(performance.now() - startTime);
    logger.success(`Bot fully loaded and ready in ${totalTime}ms`);
  } catch (error) {
    logger.error('🚨 Critical error during bot initialization:');
    ErrorHandler.handleError(error, 'Bot Initialization', logger);
    logger.error('💡 Check your configuration and try again');
    process.exit(1);
  }
}

// Register global error handlers
ErrorHandler.registerGlobalHandlers();

main().catch(error => {
  console.error('🚨 Unhandled error in main():', error);
  process.exit(1);
});