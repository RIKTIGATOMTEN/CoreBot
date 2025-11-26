/**
 * ADDON VALIDATION
 * ================
 * Validates addon.info file fields.
 * 
 * WHY THIS EXISTS:
 * - Catches configuration errors early
 * - Ensures required fields are present
 * - Validates field formats (version, priority, paths)
 * - Returns helpful error messages
 * 
 * REQUIRED FIELDS:
 * - author: Who created the addon
 * - addonfile OR commandfile: At least one entry point
 * 
 * OPTIONAL VALIDATED FIELDS:
 * - name: Must be non-empty string
 * - version: Should be X.Y or X.Y.Z format
 * - priority: Must be non-negative integer
 * - enabled: Must be true or false
 * - File paths: Must be relative, not absolute
 */

import path from 'path';
import { logger } from '../../utils/logger.js';
import { AddonInfo } from './types.js';

/**
 * Validate addon.info fields
 * Returns array of validation errors (empty if valid)
 */
export function validateAddonInfo(info: any, infoPath: string): string[] {
  const errors: string[] = [];
  
  // Required: author
  if (!info.author || typeof info.author !== 'string' || info.author.trim() === '') {
    errors.push('Missing or invalid "author" field (must be non-empty string)');
  }
  
  // Required: at least one file
  if (!info.addonfile && !info.commandfile && !(info as any).mainfile) {
    errors.push('Must specify at least one of: addonfile, commandfile, mainfile');
  }
  
  // Priority validation
  if (info.priority !== undefined) {
    const priority = Number(info.priority);
    if (isNaN(priority)) {
      errors.push(`Invalid "priority" field: "${info.priority}" (must be a number)`);
    } else if (priority < 0) {
      errors.push(`Invalid "priority" field: ${priority} (must be >= 0)`);
    } else if (!Number.isInteger(priority)) {
      errors.push(`Invalid "priority" field: ${priority} (must be an integer)`);
    }
  }
  
  // Enabled validation
  if (info.enabled !== undefined) {
    const enabled = String(info.enabled).toLowerCase();
    if (enabled !== 'true' && enabled !== 'false') {
      errors.push(`Invalid "enabled" field: "${info.enabled}" (must be boolean true/false)`);
    }
  }
  
  // Version validation (if present, should follow semver-ish)
  if (info.version !== undefined) {
    if (typeof info.version !== 'string') {
      errors.push(`Invalid "version" field: must be a string`);
    } else if (!/^\d+\.\d+(\.\d+)?$/.test(info.version)) {
      // This is a warning, not an error
      logger.warn(`Non-standard version format: "${info.version}" (expected X.Y or X.Y.Z) in ${path.basename(infoPath)}`);
    }
  }
  
  // Name validation (if present)
  if (info.name !== undefined && (typeof info.name !== 'string' || info.name.trim() === '')) {
    errors.push(`Invalid "name" field: must be non-empty string`);
  }
  
  // File path validation (check if paths look reasonable)
  const filePaths = [info.addonfile, info.commandfile, (info as any).mainfile, info.eventfile, info.intentconfig].filter(Boolean);
  for (const filePath of filePaths) {
    if (typeof filePath !== 'string') {
      errors.push(`Invalid file path: must be a string, got ${typeof filePath}`);
    } else if (path.isAbsolute(filePath)) {
      errors.push(`Invalid file path: "${filePath}" (must be relative, not absolute)`);
    }
  }
  
  return errors;
}