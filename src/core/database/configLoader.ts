import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger.js';
import {ensureIfNotExists, validateQuery} from './queryValidator.js';

export interface QueryInfo {
  query: string;
  source: string;
  tableName?: string;
  index?: number;
}

/**
 * Find all SQL files in a directory recursively
 */
async function findSqlFiles(dir: string, sqlFiles: string[] = []): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, {withFileTypes: true});

    // Parallelize subdirectory scanning
    const subdirPromises: Promise<void>[] = [];
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        subdirPromises.push(
          findSqlFiles(fullPath, sqlFiles).then(() => {})
        );
      } else if (entry.isFile() && entry.name.endsWith('.sql')) {
        sqlFiles.push(fullPath);
      }
    }

    await Promise.all(subdirPromises);
  } catch (error) {
    logger.warn(`Could not read directory ${dir}:`, (error as Error).message);
  }

  return sqlFiles;
}

/**
 * Parse a SQL file and extract individual statements
 */
async function parseSqlFile(fullPath: string): Promise<QueryInfo[]> {
  const queries: QueryInfo[] = [];

  try {
    const fileContent = await fs.readFile(fullPath, 'utf8');

    // Optimized comment removal - single pass with regex
    const cleanedContent = fileContent
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .replace(/(?:^|\n)\s*(?:--|#).*$/gm, ''); // Remove single-line comments

    // Split by semicolon and filter in one pass
    const statements = cleanedContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    // Pre-compile regex for table name extraction (reused in loop)
    const tableNameRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?/i;
    const basename = path.basename(fullPath);

    for (let i = 0; i < statements.length; i++) {
      const query = ensureIfNotExists(statements[i]);

      try {
        validateQuery(query);

        // Extract table name (optimized with pre-compiled regex)
        const tableNameMatch = query.match(tableNameRegex);
        const tableName = tableNameMatch?.[1];

        queries.push({
          query,
          source: `${basename}:Statement ${i + 1}`,
          tableName,
          index: i + 1,
        });
      } catch (validationError) {
        logger.error(
          `Invalid query in ${basename} (Statement ${i + 1}):`,
          (validationError as Error).message
        );
      }
    }

    if (statements.length > 0) {
      logger.info(`Loaded ${statements.length} statement(s) from ${basename}`);
    }
  } catch (error) {
    logger.error(`Could not parse SQL file ${path.basename(fullPath)}:`, (error as Error).message);
  }

  return queries;
}

/**
 * Load database configurations from SQL files
 */
export async function loadDatabaseConfigs(configDir: string): Promise<QueryInfo[]> {
  try {
    // Check if directory exists
    try {
      const stats = await fs.stat(configDir);
      if (!stats.isDirectory()) {
        logger.warn(`Source path exists but is not a directory: ${configDir}`);
        return [];
      }
    } catch (statError) {
      logger.error(`Source directory does not exist or is not accessible: ${configDir}`);
      return [];
    }

    // Find all SQL files
    const sqlFiles = await findSqlFiles(configDir);

    if (sqlFiles.length === 0) {
      logger.info(`No SQL files found`);
      return [];
    }

    logger.info(`📂 Found ${sqlFiles.length} SQL file(s) in ${configDir}`);

    // OPTIMIZATION: Parse all SQL files in parallel
    const allQueriesArrays = await Promise.all(
      sqlFiles.map(fullPath => parseSqlFile(fullPath))
    );

    // Flatten the results
    const allQueries = allQueriesArrays.flat();

    logger.info(`Loaded ${allQueries.length} total database statement(s)`);

    return allQueries;
  } catch (error) {
    logger.error('Error loading database configurations:', error);
    return [];
  }
}