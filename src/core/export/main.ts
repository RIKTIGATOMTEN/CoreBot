// ============================================================================
// DATABASE
// ============================================================================
export {
  db,
  initDatabases,
  closeDatabase,
  loadDatabaseConfigs,
  executeQueries,
  validateQuery,
  ensureIfNotExists,
} from './db.js';
export type {QueryInfo} from './db.js';

// ============================================================================
// LOGGER
// ============================================================================
export {logger} from './logger.js';
export type {Logger} from './logger.js';

// ============================================================================
// API PROTECTION
// ============================================================================
export {default as protect} from '../utils/api/protect.js';
export {default as requestTracker, RequestTracker} from '../utils/api/requestTracker.js';
export {default as userLimiter, UserLimiter} from '../utils/api/userLimiter.js';

// ============================================================================
// FILE UTILITIES
// ============================================================================
export {parseInfoFile} from '../utils/fileUtils.js';
export type {AddonInfo} from '../utils/fileUtils.js';

// ============================================================================
// PATHS
// ============================================================================
export {ROOT_DIR, CONFIG_DIR, ADDONS_DIR, EVENTS_DIR, DATABASE_DIR, ENV_PATH, PACKAGE_JSON} from '../utils/paths.js';

// ============================================================================
// ERROR HANDLING
// ============================================================================
export {ErrorHandler} from '../handlers/errors/main.js';

// ============================================================================
// ENVIRONMENT & CONFIG
// ============================================================================
export {
  config,
  TOKEN,
  CLIENT_ID,
  GUILD_ID,
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  loadAddons,
  isDebug,
  validateEnvironmentVariables,
  getProjectDirectory,
} from '../config/environment.js';

// ============================================================================
// DISCORD.JS TYPE RE-EXPORTS
// ============================================================================
export type {
  Client,
  Interaction,
  ButtonInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
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