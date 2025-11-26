/**
 * DATABASE MODULE EXPORTS
 * =======================
 * Main entry point for database functionality.
 * 
 * WHY THIS EXISTS:
 * - Single import point for all database features
 * - Re-exports from submodules for cleaner imports
 * - Keeps the public API simple while hiding complexity
 * 
 * HOW IT WORKS:
 * - Re-exports database instance and pool from connection/
 * - Re-exports schema initialization from schema/
 * - Re-exports query utilities from query/
 * - Re-exports configuration helpers from config/
 * 
 * USAGE:
 * import { db, initDatabases } from '#core';
 * 
 * // Direct database access
 * const result = db.prepare('SELECT * FROM users').all();
 * 
 * // Initialize all addon database schemas
 * await initDatabases(db);
 */

import { db, pool, closePool, dbConfig } from './connection/index.js';
import { initDatabases } from './schema/index.js';
import { loadDatabaseConfigs } from './schema/index.js';
import { executeQueries, validateQuery, ensureIfNotExists, convertMySQLToSQLite } from './query/index.js';
import { loadDatabaseConfig, getDatabasePath, validateDatabaseConfig } from './config/index.js';

export { db, pool, dbConfig };
export { initDatabases, closePool as closeDatabase };
export { loadDatabaseConfig, getDatabasePath, validateDatabaseConfig };
export { loadDatabaseConfigs, executeQueries, validateQuery, ensureIfNotExists, convertMySQLToSQLite };

export type { QueryInfo } from './types.js';
export type { DatabaseConfig } from './types.js';