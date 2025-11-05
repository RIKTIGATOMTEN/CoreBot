import {pool, closePool} from './connectionPool.js';
import {initDatabases} from './initializer.js';
import {loadDatabaseConfigs} from './configLoader.js';
import {executeQueries} from './queryExecutor.js';
import {validateQuery, ensureIfNotExists} from './queryValidator.js';

export const db = pool;

export {initDatabases, closePool as closeDatabase};

export {loadDatabaseConfigs, executeQueries, validateQuery, ensureIfNotExists};

export type {QueryInfo} from './configLoader.js';
