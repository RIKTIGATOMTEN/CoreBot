import {db, initDatabases} from './core/database/db.js';
import {ErrorHandler} from './core/handlers/errors/main.js';
import {logger} from './core/export/logger.js';
import {validateEnvironmentVariables} from './core/config/environment.js';
import {setupBot} from './core/setup/setup.js';

async function main(): Promise<void> {
  const startTime = performance.now();

  try {
    logger.info("Starting RiktigaTomten's Core...");

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
    const localInitTime = Math.round(performance.now() - startTime);

    logger.info('🔐 Connecting to Discord...');
    const loginStart = performance.now();
    await client.login(process.env.TOKEN);
    const discordHandshakeTime = Math.round(performance.now() - loginStart);

    const totalTime = Math.round(performance.now() - startTime);
    logger.success(`Bot fully loaded and ready in ${totalTime}ms`);
    logger.debug(`Timing breakdown: Local init ${localInitTime}ms | Discord handshake ${discordHandshakeTime}ms`);
  } catch (error) {
    logger.error('🚨 Critical error during bot initialization:');
    ErrorHandler.handleError(error, 'Bot Initialization', logger);
    logger.error('💡 Check your configuration and try again');
    process.exit(1);
  }
}

// Register global error handlers (pass the logger to avoid circular imports)
ErrorHandler.registerGlobalHandlers(logger);

main().catch(error => {
  console.error('🚨 Unhandled error in main():', error); // Final fallback - use console.error in case logger initialization failed
  process.exit(1);
});
