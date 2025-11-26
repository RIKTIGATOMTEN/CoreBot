/**
 * CORE EXPORTS
 * ============
 * Main entry point for the #core import alias.
 * 
 * WHY THIS EXISTS:
 * - Single import point for all core functionality
 * - Clean public API for addon developers
 * - Re-exports from all core modules
 * 
 * USAGE IN ADDONS:
 * import { 
 *   db, logger, AddonBus, AddonRegistry,
 *   ADDONS_DIR, parseInfoFile
 * } from '#core';
 * 
 * CATEGORIES:
 * - Database: db, initDatabases, executeQueries
 * - Logging: logger, locale
 * - API Utils: protect, requestTracker, userLimiter
 * - File Utils: parseInfoFile, path constants
 * - Error Handling: ErrorHandler
 * - Registry: AddonRegistry for addon APIs
 * - Event Bus: AddonBus for inter-addon events
 * - Environment: config, isDebug, TOKEN
 * - Cache: CacheManager, JSONCacheManager
 * - Intents: requestIntent, hasIntent
 * - Interactions: InteractionRegistry
 * - Discord.js: Re-exported types and classes
 */

// core/export/main.ts

// Import Database type to make it available in the module scope
import type Database from 'better-sqlite3';
export type { Database };

// ===== Database =====
export {
  db,
  initDatabases,
  closeDatabase,
  loadDatabaseConfigs,
  executeQueries,
  validateQuery,
  ensureIfNotExists,
} from './db.js';
export type { QueryInfo } from './db.js';

// ===== Logging =====
export { logger } from './logger.js';
export type { Logger } from './logger.js';

// ===== Locale =====
export { locale } from '../utils/locale.js';
export type { LocaleHandler, LocaleConfig } from '../utils/locale.js';

// ===== API Utils =====
export { default as protect } from '../utils/api/protect/index.js';
export { default as requestTracker, RequestTracker } from '../utils/api/requestTracker/index.js';
export { default as userLimiter, UserLimiter } from '../utils/api/rateLimiter/index.js';

// ===== File Utils =====
export { parseInfoFile } from '../utils/fileUtils.js';
export type { AddonInfo } from '../utils/fileUtils.js';

// ===== Paths =====
export {
  ROOT_DIR,
  CONFIG_DIR,
  ADDONS_DIR,
  EVENTS_DIR,
  DATABASE_DIR,
  ENV_PATH,
  PACKAGE_JSON,
} from '../utils/paths.js';

// ===== Error Handling =====
export { ErrorHandler } from '../handlers/errors/main.js';

// ===== Registry =====
export { AddonRegistry } from '../handlers/registry/AddonRegistry.js';
export type {
  RegisteredAddon,
  AddonMetadata,
  RegistryStats,
  AddonInfo as RegistryAddonInfo,
} from '../handlers/registry/types.js';

// ===== Event Bus =====
export { AddonBus } from '../handlers/bus/AddonBus.js';
export type { BusStats, EventListener } from '../handlers/bus/types.js';

// ===== Environment =====
export {
  config,
  TOKEN,
  CLIENT_ID,
  GUILD_ID,
  loadAddons,
  isDebug,
  validateEnvironmentVariables,
  getProjectDirectory,
} from '../config/environment.js';

// ===== Cache =====
export {
  CacheManager,
  JSONCacheManager,
  listAllCaches,
  clearAllCaches,
} from '../handlers/cache/main.js';

// ===== Intents =====
export {
  requestIntent,
  requestIntents,
  hasIntent,
  GatewayIntentBits,
} from '../config/intents.js';

// ===== Interactions =====
export { InteractionRegistry } from '../handlers/interactions/InteractionRegistry.js';
export type {
  InteractionHandler,
  InteractionType,
  InteractionMatchType,
  InteractionRegistration,
} from '../handlers/interactions/InteractionRegistry.js';

// ===== Discord.js Re-exports =====
export type {
  Client,
  Interaction,
  ButtonInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
  AnySelectMenuInteraction,
  ChatInputCommandInteraction,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ModalBuilder,
  TextInputBuilder,
  SlashCommandBuilder,
  Collection,
} from 'discord.js';

// ===== Default Export (for backwards compatibility with JS addons) =====
import * as dbModule from './db.js';
import { logger } from './logger.js';
import { locale } from '../utils/locale.js';
import protectDefault from '../utils/api/protect/index.js';
import requestTrackerDefault from '../utils/api/requestTracker/index.js';
import userLimiterDefault from '../utils/api/rateLimiter/index.js';
import { parseInfoFile } from '../utils/fileUtils.js';
import {
  ROOT_DIR,
  CONFIG_DIR,
  ADDONS_DIR,
  EVENTS_DIR,
  DATABASE_DIR,
  ENV_PATH,
  PACKAGE_JSON,
} from '../utils/paths.js';
import { ErrorHandler } from '../handlers/errors/main.js';
import { AddonRegistry } from '../handlers/registry/AddonRegistry.js';
import { AddonBus } from '../handlers/bus/AddonBus.js';
import {
  config,
  TOKEN,
  CLIENT_ID,
  GUILD_ID,
  loadAddons,
  isDebug,
  validateEnvironmentVariables,
  getProjectDirectory,
} from '../config/environment.js';
import {
  CacheManager,
  JSONCacheManager,
  listAllCaches,
  clearAllCaches,
} from '../handlers/cache/main.js';
import { requestIntent, requestIntents, hasIntent, GatewayIntentBits } from '../config/intents.js';
import { InteractionRegistry } from '../handlers/interactions/InteractionRegistry.js';

// Define the core type explicitly to avoid declaration emission issues
interface CoreExports {
  db: typeof dbModule.db;
  initDatabases: typeof dbModule.initDatabases;
  closeDatabase: typeof dbModule.closeDatabase;
  loadDatabaseConfigs: typeof dbModule.loadDatabaseConfigs;
  executeQueries: typeof dbModule.executeQueries;
  validateQuery: typeof dbModule.validateQuery;
  ensureIfNotExists: typeof dbModule.ensureIfNotExists;
  logger: typeof logger;
  locale: typeof locale;
  protect: typeof protectDefault;
  requestTracker: typeof requestTrackerDefault;
  userLimiter: typeof userLimiterDefault;
  parseInfoFile: typeof parseInfoFile;
  ROOT_DIR: typeof ROOT_DIR;
  CONFIG_DIR: typeof CONFIG_DIR;
  ADDONS_DIR: typeof ADDONS_DIR;
  EVENTS_DIR: typeof EVENTS_DIR;
  DATABASE_DIR: typeof DATABASE_DIR;
  ENV_PATH: typeof ENV_PATH;
  PACKAGE_JSON: typeof PACKAGE_JSON;
  ErrorHandler: typeof ErrorHandler;
  AddonRegistry: typeof AddonRegistry;
  AddonBus: typeof AddonBus;
  config: typeof config;
  TOKEN: typeof TOKEN;
  CLIENT_ID: typeof CLIENT_ID;
  GUILD_ID: typeof GUILD_ID;
  loadAddons: typeof loadAddons;
  isDebug: typeof isDebug;
  validateEnvironmentVariables: typeof validateEnvironmentVariables;
  getProjectDirectory: typeof getProjectDirectory;
  requestIntent: typeof requestIntent;
  requestIntents: typeof requestIntents;
  hasIntent: typeof hasIntent;
  GatewayIntentBits: typeof GatewayIntentBits;
  InteractionRegistry: typeof InteractionRegistry;
  CacheManager: typeof CacheManager;
  JSONCacheManager: typeof JSONCacheManager;
  listAllCaches: typeof listAllCaches;
  clearAllCaches: typeof clearAllCaches;
}

const coreDefault: CoreExports = {
  ...dbModule,
  logger,
  locale,
  protect: protectDefault,
  requestTracker: requestTrackerDefault,
  userLimiter: userLimiterDefault,
  parseInfoFile,
  ROOT_DIR,
  CONFIG_DIR,
  ADDONS_DIR,
  EVENTS_DIR,
  DATABASE_DIR,
  ENV_PATH,
  PACKAGE_JSON,
  ErrorHandler,
  AddonRegistry,
  AddonBus,
  config,
  TOKEN,
  CLIENT_ID,
  GUILD_ID,
  loadAddons,
  isDebug,
  validateEnvironmentVariables,
  getProjectDirectory,
  requestIntent,
  requestIntents,
  hasIntent,
  GatewayIntentBits,
  InteractionRegistry,
  CacheManager,
  JSONCacheManager,
  listAllCaches,
  clearAllCaches,
};

export const core: CoreExports = coreDefault;
export type { CoreExports };
export default coreDefault;