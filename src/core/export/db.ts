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