import {Pool} from 'mysql2/promise';
import logger from '../utils/logger.js';
import {ADDONS_DIR} from '../utils/paths.js';
import {loadDatabaseConfigs} from './configLoader.js';
import {executeQueries} from './queryExecutor.js';

export async function initDatabases(pool: Pool, configDir: string = ADDONS_DIR): Promise<void> {
  const startTime = Date.now();

  try {
    // OPTIMIZATION: Load configs and warmup pool in parallel
    const [queries] = await Promise.all([
      loadDatabaseConfigs(configDir),
      // Warmup is optional - uncomment if you imported warmupPool
      // warmupPool(2)
    ]);

    const {successCount, skippedCount, errorCount} = await executeQueries(pool, queries);

    const duration = Date.now() - startTime;
    logger.info(`Database setup complete: ${successCount} created, ${skippedCount} skipped, ${errorCount} errors`);
    logger.info(`Database initialization completed in ${duration}ms`);
  } catch (error) {
    logger.error('Error during database initialization:', error);
    throw error;
  }
}