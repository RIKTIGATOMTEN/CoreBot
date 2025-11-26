/**
 * FILE UTILITIES
 * ==============
 * Parse .info files used by addons and commands for metadata.
 * 
 * WHY THIS EXISTS:
 * - Addons/commands need metadata (name, version, author, priority, etc.)
 * - Using simple key:value format instead of JSON for human readability
 * - Allows comments with # for documentation
 * 
 * FILE FORMAT (addon.info):
 * # This is a comment
 * author: RiktigaTomten
 * addonfile: ./main.js
 * commandfile: ./commands.js
 * intentconfig: ./intent.js
 * extensions: ./extensions/
 * priority: 10
 * version: 1.0
 * enabled: true
 * 
 * EXTENSIONS SUPPORT:
 * If an addon specifies "extensions: ./extensions/", the loader will
 * automatically discover and load subdirectories in that path as child
 * extensions. Each extension must have its own addon.info file.
 * 
 * Example structure:
 * /addons/RiktigaTomten/Tickets/
 *   ├── addon.info (with extensions: ./extensions/)
 *   ├── script/main.ts
 *   └── extensions/
 *       ├── Tickets-logger/
 *       │   ├── addon.info
 *       │   └── main.js
 *       └── Tickets-api/
 *           ├── addon.info
 *           └── main.js
 * 
 * HOW IT WORKS:
 * - Reads file line by line
 * - Ignores empty lines and comments (lines starting with #)
 * - Splits on first colon (:) to get key:value pairs
 * - Handles values with colons (e.g., urls with http://)
 * - Converts boolean strings to actual booleans
 * - Converts numeric strings to numbers where appropriate
 */

import { readFileSync } from 'fs';
import { logger } from './logger.js';

export interface AddonInfo {
  author: string;
  name?: string;
  version?: string;
  priority?: number;
  enabled?: boolean;
  addonfile?: string;
  commandfile?: string;
  eventfile?: string;
  intentconfig?: string;
  mainconfig?: string;
  extensions?: string;
  [key: string]: string | number | boolean | undefined;
}

export function parseInfoFile(filePath: string): AddonInfo | null {
  try {
    const raw = readFileSync(filePath, 'utf8');
    const info: any = {};
    
    raw.split(/\r?\n/).forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      
      const [key, ...rest] = line.split(':');
      if (!key) return;
      
      const value = rest.join(':').trim();
      const trimmedKey = key.trim();
      
      // Convert boolean strings to actual booleans
      if (value.toLowerCase() === 'true') {
        info[trimmedKey] = true;
      } else if (value.toLowerCase() === 'false') {
        info[trimmedKey] = false;
      }
      // Convert numeric strings to numbers (for priority, etc.)
      else if (trimmedKey === 'priority' && !isNaN(Number(value))) {
        info[trimmedKey] = Number(value);
      }
      // Keep as string
      else {
        info[trimmedKey] = value;
      }
    });
    
    return info as AddonInfo;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(`Failed to read info file at ${filePath}:`, error);
    return null;
  }
}