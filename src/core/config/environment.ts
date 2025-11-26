/**
 * ENVIRONMENT CONFIGURATION
 * =========================
 * Loads and validates environment variables from .env file.
 * 
 * WHY THIS EXISTS:
 * - Centralizes all environment variable access in one place
 * - Provides type-safe configuration objects
 * - Validates required variables at startup before bot runs
 * - Separates bot config from feature flags for cleaner code
 * 
 * HOW IT WORKS:
 * - Loads .env file from config directory using dotenv
 * - Exports individual variables for direct access
 * - Exports grouped config object for structured access
 * - validateEnvironmentVariables() checks all required vars
 * 
 * USAGE IN ADDONS:
 * import { config, TOKEN, isDebug } from '#core';
 * 
 * if (config.features.debug) {
 *   console.log('Debug mode enabled');
 * }
 */

import * as dotenv from 'dotenv';
import { ENV_PATH, ROOT_DIR } from '../utils/paths.js';

dotenv.config({ path: ENV_PATH });

// Bot Configuration
export const TOKEN = process.env.TOKEN || '';
export const CLIENT_ID = process.env.CLIENT_ID || '';
export const GUILD_ID = process.env.GUILD_ID || '';
export const REGISTRATION_SCOPE = (process.env.REGISTRATION_SCOPE?.toLowerCase() || 'global') as 'global' | 'guild';

// Feature Flags
export const loadAddons = process.env.ADDONS === 'true';
export const isDebug = process.env.DEBUG === 'true';
export const clearCommands = process.env.CLEAR_COMMANDS === 'true';

// Grouped config object
export const config = {
  bot: {
    token: TOKEN,
    clientId: CLIENT_ID,
    guildId: GUILD_ID,
    registrationScope: REGISTRATION_SCOPE,
  },
  features: {
    addons: loadAddons,
    debug: isDebug,
    clearCommands: clearCommands,
  }
} as const;

export function validateEnvironmentVariables() {
  const requiredEnvVars = ['TOKEN', 'CLIENT_ID'];
  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  // Only require GUILD_ID if scope is 'guild'
  if (REGISTRATION_SCOPE === 'guild' && !GUILD_ID) {
    missing.push('GUILD_ID (required for guild scope)');
  }
  
  return missing;
}

export function getProjectDirectory() {
  return ROOT_DIR;
}