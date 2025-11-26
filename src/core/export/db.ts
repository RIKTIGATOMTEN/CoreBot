/**
 * DATABASE EXPORTS
 * ================
 * Re-exports database functionality for the #core import alias.
 * 
 * This file exists to provide a clean import path:
 * import { db, initDatabases } from '#core';
 */

export { 
  db, 
  initDatabases, 
  closeDatabase,
  loadDatabaseConfigs,
  executeQueries,
  validateQuery,
  ensureIfNotExists
} from '../database/db.js';

export type { QueryInfo } from '../database/db.js';