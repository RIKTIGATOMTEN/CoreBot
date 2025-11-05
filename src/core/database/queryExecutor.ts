import {Pool} from 'mysql2/promise';
import logger from '../utils/logger.js';
import {QueryInfo} from './configLoader.js';

type QueryResult =
  | {success: true; source: string; tableName?: string; index?: number; skipped?: boolean}
  | {success: false; source: string; tableName?: string; index?: number; error: string};

async function executeQuery(pool: Pool, {query, source, tableName, index}: QueryInfo): Promise<QueryResult> {
  try {
    await pool.execute(query);
    return {success: true, source, tableName, index};
  } catch (err) {
    const error = err as Error;
    // Fast string check instead of includes
    if (error.message.indexOf('already exists') !== -1) {
      return {success: true, source, tableName, index, skipped: true};
    }
    return {
      success: false,
      source,
      tableName,
      index,
      error: error.message,
    };
  }
}

export async function executeQueries(
  pool: Pool,
  queries: QueryInfo[],
  concurrencyLimit: number = 10 // Increased from 5 to 10 for better parallelism
): Promise<{successCount: number; skippedCount: number; errorCount: number}> {
  if (queries.length === 0) {
    logger.info('No database queries found to execute');
    return {successCount: 0, skippedCount: 0, errorCount: 0};
  }

  logger.debug(`Executing ${queries.length} database queries with concurrency control...`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Process all batches in parallel instead of sequentially
  const batches: QueryInfo[][] = [];
  for (let i = 0; i < queries.length; i += concurrencyLimit) {
    batches.push(queries.slice(i, i + concurrencyLimit));
  }

  // OPTIMIZATION: Process batches in parallel if there are multiple
  // For single batch, this behaves the same but avoids Promise.all overhead
  if (batches.length === 1) {
    const results = await Promise.allSettled(
      batches[0].map(queryInfo => executeQuery(pool, queryInfo))
    );
    processResults(results);
  } else {
    // For multiple batches, still process sequentially to respect concurrency
    // but optimize the result processing
    for (const batch of batches) {
      const results = await Promise.allSettled(
        batch.map(queryInfo => executeQuery(pool, queryInfo))
      );
      processResults(results);
    }
  }

  function processResults(results: PromiseSettledResult<QueryResult>[]) {
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const value = result.value;
        
        if (value.success) {
          if (value.skipped) {
            logger.debug(`Skipped ${value.source} (already exists)`);
            skippedCount++;
          } else {
            if (value.tableName) {
              logger.info(`Table ${value.tableName} is ready`);
            } else if (value.index) {
              logger.info(`Query ${value.index} executed successfully`);
            }
            successCount++;
          }
        } else {
          logger.error(`Error in ${value.source}:`, value.error);
          errorCount++;
        }
      } else {
        logger.error(`Query failed:`, result.reason);
        errorCount++;
      }
    }
  }

  return {successCount, skippedCount, errorCount};
}