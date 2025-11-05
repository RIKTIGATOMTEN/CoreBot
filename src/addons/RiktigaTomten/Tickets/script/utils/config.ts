import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import yaml from 'yaml';
import { TicketConfig, LanguageStrings } from '../types/index.js';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache configuration
interface ConfigCache {
  ticketOptions: { Ticket: TicketConfig };
  lang: LanguageStrings;
  timestamp: number;
}

let configCache: ConfigCache | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function loadConfig(): Promise<{
  ticketOptions: { Ticket: TicketConfig };
  lang: LanguageStrings;
}> {
  const now = Date.now();
  
  // Return cached config if still valid
  if (configCache && (now - configCache.timestamp) < CACHE_DURATION) {
    logger.debug('Using cached configuration');
    return {
      ticketOptions: configCache.ticketOptions,
      lang: configCache.lang
    };
  }

  logger.debug('Loading fresh configuration and language files');

  try {
    // Load both files in parallel for speed
    const [ticketOptionsRaw, langRaw] = await Promise.all([
      fs.readFile(
        path.join(__dirname, '..', '..', 'config', 'ticketOptions.yaml'),
        'utf8'
      ),
      fs.readFile(
        path.join(__dirname, '..', '..', 'lang', 'lang.json'),
        'utf8'
      ).catch(err => {
        logger.warn('Language file not found, using empty lang object');
        return '{}';
      })
    ]);

    // Parse YAML instead of JSON
    const ticketOptions = yaml.parse(ticketOptionsRaw);
    const lang: LanguageStrings = JSON.parse(langRaw);

    // Cache the loaded config
    configCache = {
      ticketOptions,
      lang,
      timestamp: now
    };

    logger.debug('Configuration and language loaded successfully');
    
    return { ticketOptions, lang };
  } catch (err) {
    logger.error('Error loading configuration files:', err);
    throw err;
  }
}

export async function saveConfig(config: { Ticket: TicketConfig }): Promise<void> {
  try {
    const configPath = path.join(__dirname, '..', '..', 'config', 'ticketOptions.yaml');
    
    // Write with YAML formatting and comments preserved
    const yamlString = yaml.stringify(config, {
      indent: 2,
      lineWidth: 0, // Don't wrap lines
      minContentWidth: 0,
      defaultKeyType: 'PLAIN',
      defaultStringType: 'QUOTE_DOUBLE'
    });
    
    await fs.writeFile(configPath, yamlString, 'utf8');
    
    // Invalidate cache so next load gets fresh data
    configCache = null;
    
    logger.debug('Configuration saved successfully');
  } catch (err) {
    logger.error('Error saving configuration:', err);
    throw err;
  }
}

export function invalidateConfigCache(): void {
  configCache = null;
  logger.debug('Configuration cache invalidated');
}

export function getLangString(
  lang: LanguageStrings,
  key: string,
  fallback: string
): string {
  return (lang?.['ticket.js'] && lang['ticket.js'][key]) || fallback;
}

// Utility to get config path (useful for external tools)
export function getConfigPath(): string {
  return path.join(__dirname, '..', '..', 'config', 'ticketOptions.yaml');
}

// Utility to watch config file for changes (optional)
export async function watchConfig(callback: () => void): Promise<void> {
  const configPath = getConfigPath();
  
  try {
    const watcher = fs.watch(configPath);
    
    for await (const event of watcher) {
      if (event.eventType === 'change') {
        logger.info('Config file changed, invalidating cache');
        invalidateConfigCache();
        callback();
      }
    }
  } catch (err) {
    logger.error('Error watching config file:', err);
  }
}