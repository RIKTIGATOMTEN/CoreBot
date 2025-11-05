import { 
  config,
  isDebug,
  logger,
  db,
  protect,
  requestTracker,
  userLimiter,
  ErrorHandler,
  parseInfoFile,
  TOKEN,
  CLIENT_ID,
  GUILD_ID,
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  loadAddons,
  ROOT_DIR,
  CONFIG_DIR,
  ADDONS_DIR,
  EVENTS_DIR,
  DATABASE_DIR,
  ENV_PATH,
  PACKAGE_JSON,
  validateEnvironmentVariables,
  getProjectDirectory
} from '#core';

export default {
  async execute(client) {
    logger.success('Test addon initialized - Testing all #core exports!');
    logger.log('================================================');
    
    // ============================================================================
    // CONFIG OBJECT
    // ============================================================================
    logger.info('📦 Config Object:');
    logger.info(`  Bot Token: ${config.bot.token.substring(0, 20)}...`);
    logger.info(`  Client ID: ${config.bot.clientId}`);
    logger.info(`  Guild ID: ${config.bot.guildId}`);
    logger.info(`  Database Host: ${config.database.host}`);
    logger.info(`  Database Port: ${config.database.port}`);
    logger.info(`  Database User: ${config.database.user}`);
    logger.info(`  Database Password: ${config.database.password}`);
    logger.info(`  Database Name: ${config.database.name}`);
    logger.info(`  Addons Enabled: ${config.features.addons}`);
    logger.info(`  Debug Mode: ${config.features.debug}`);
    
    // ============================================================================
    // INDIVIDUAL EXPORTS
    // ============================================================================
    logger.info('📋 Individual Config Exports:');
    logger.info(`  TOKEN: ${TOKEN.substring(0, 20)}...`);
    logger.info(`  CLIENT_ID: ${CLIENT_ID}`);
    logger.info(`  GUILD_ID: ${GUILD_ID}`);
    logger.info(`  DB_HOST: ${DB_HOST}`);
    logger.info(`  DB_PORT: ${DB_PORT}`);
    logger.info(`  DB_USER: ${DB_USER}`);
    logger.info(`  DB_PASSWORD: ${DB_PASSWORD}`);
    logger.info(`  DB_NAME: ${DB_NAME}`);
    logger.info(`  loadAddons: ${loadAddons}`);
    logger.info(`  isDebug: ${isDebug}`);
    
    // ============================================================================
    // PATHS
    // ============================================================================
    logger.info('📂 Path Exports:');
    logger.info(`  ROOT_DIR: ${ROOT_DIR}`);
    logger.info(`  CONFIG_DIR: ${CONFIG_DIR}`);
    logger.info(`  ADDONS_DIR: ${ADDONS_DIR}`);
    logger.info(`  EVENTS_DIR: ${EVENTS_DIR}`);
    logger.info(`  DATABASE_DIR: ${DATABASE_DIR}`);
    logger.info(`  ENV_PATH: ${ENV_PATH}`);
    logger.info(`  PACKAGE_JSON: ${PACKAGE_JSON}`);
    
    // ============================================================================
    // FUNCTIONS
    // ============================================================================
    logger.info('🔧 Function Exports:');
    const missingVars = validateEnvironmentVariables();
    logger.info(`  validateEnvironmentVariables(): Missing vars = ${missingVars.length > 0 ? missingVars.join(', ') : 'None'}`);
    logger.info(`  getProjectDirectory(): ${getProjectDirectory()}`);
    
    // ============================================================================
    // DATABASE
    // ============================================================================
    logger.info('💾 Database Export:');
    try {
      const [rows] = await db.query('SELECT DATABASE() as current_db');
      logger.info(`  db.query() works! Current database: ${rows[0].current_db}`);
    } catch (error) {
      logger.error(`  db.query() failed:`, error);
    }
    
    // ============================================================================
    // API PROTECTION
    // ============================================================================
    logger.info('🛡️ API Protection Exports:');
    
    // Test requestTracker
    requestTracker.mark('test-user', 'test-action', 5000);
    const isProcessing = requestTracker.isProcessing('test-user', 'test-action');
    logger.info(`  requestTracker.isProcessing(): ${isProcessing}`);
    requestTracker.release('test-user', 'test-action');
    const stats = requestTracker.getStats();
    logger.info(`  requestTracker.getStats(): ${stats.active} active requests`);
    
    // Test userLimiter
    userLimiter.setLimit('test:limit', 5, 10000);
    const limitCheck = userLimiter.check('test-user', 'test:limit');
    logger.info(`  userLimiter.check(): allowed=${limitCheck.allowed}, remaining=${limitCheck.remaining}`);
    const limiterStats = userLimiter.getStats();
    logger.info(`  userLimiter.getStats(): ${limiterStats.totalEntries} total entries`);
    
    // Test protect
    try {
      const result = await protect('test-user', 'protected-action', async () => {
        return 'Protected function executed!';
      });
      logger.info(`  protect(): ${result}`);
    } catch (error) {
      logger.warn(`  protect() rate limited or duplicate:`, error.message);
    }
    
    // ============================================================================
    // ERROR HANDLER
    // ============================================================================
    logger.info('⚠️ Error Handler Export:');
    logger.info(`  ErrorHandler available: ${typeof ErrorHandler !== 'undefined'}`);
    const testError = new Error('Test error');
    const isCritical = ErrorHandler.isCritical(testError);
    logger.info(`  ErrorHandler.isCritical(): ${isCritical}`);
    
    // ============================================================================
    // FILE UTILITIES
    // ============================================================================
    logger.info('📄 File Utilities:');
    try {
      const addonInfo = parseInfoFile(`${ADDONS_DIR}/Test/addon.info`);
      logger.info(`  parseInfoFile(): ${addonInfo ? JSON.stringify(addonInfo) : 'Failed'}`);
    } catch (error) {
      logger.warn(`  parseInfoFile() failed:`, error.message);
    }
    
    // ============================================================================
    // CLIENT (from global)
    // ============================================================================
    logger.info('Discord Client (globalThis.client):');
    logger.info(`  Client available: ${typeof client !== 'undefined'}`);
    logger.info(`  Client ready: ${client.isReady()}`);
    logger.info(`  Client user: ${client.user?.tag}`);
    logger.info(`  Guilds: ${client.guilds.cache.size}`);
    logger.info(`  Users: ${client.users.cache.size}`);
    
    logger.log('================================================');
    logger.success('All #core exports tested successfully!');
  }
};