import * as dotenv from 'dotenv';
import { ENV_PATH, ROOT_DIR } from '../utils/paths.js';

dotenv.config({ path: ENV_PATH });

// Bot Configuration
export const TOKEN = process.env.TOKEN || '';
export const CLIENT_ID = process.env.CLIENT_ID || '';
export const GUILD_ID = process.env.GUILD_ID || '';

// Database Configuration
export const DB_HOST = process.env.DB_HOST || 'localhost';
export const DB_PORT = parseInt(process.env.DB_PORT || '3306');
export const DB_USER = process.env.DB_USER || 'root';
export const DB_PASSWORD = process.env.DB_PASSWORD || '';
export const DB_NAME = process.env.DB_NAME || '';

// Feature Flags
export const loadAddons = process.env.ADDONS === 'true';
export const isDebug = process.env.DEBUG === 'true';

// Grouped config object
export const config = {
  bot: {
    token: TOKEN,
    clientId: CLIENT_ID,
    guildId: GUILD_ID,
  },
  database: {
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    name: DB_NAME,
  },
  features: {
    addons: loadAddons,
    debug: isDebug,
  }
} as const;

export function validateEnvironmentVariables() {
  const requiredEnvVars = ['TOKEN', 'CLIENT_ID', 'GUILD_ID'];
  return requiredEnvVars.filter(varName => !process.env[varName]);
}

export function getProjectDirectory() {
  // Simply return ROOT_DIR from paths instead of using require
  return ROOT_DIR;
}