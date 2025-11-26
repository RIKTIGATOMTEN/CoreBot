/**
 * REGISTRY LOGGER
 * ===============
 * Debug logging for registry operations.
 * 
 * WHY THIS EXISTS:
 * - Centralized logging for registry events
 * - Consistent log formatting
 * - Tracks registrations and access attempts
 * 
 * INTERNAL USE:
 * This class is used by AddonRegistry internally.
 */

import { logger } from '../../utils/logger.js';

export class RegistryLogger {
  logRegister(name: string, isOverwrite: boolean = false): void {
    if (isOverwrite) {
      logger.warn(`[Registry] Addon '${name}' is already registered, overwriting...`);
    } else {
      logger.debug(`[Registry] Registered addon: ${name}`);
    }
  }

  logUnregister(name: string, success: boolean): void {
    if (success) {
      logger.debug(`[Registry] Unregistered addon: ${name}`);
    } else {
      logger.warn(`[Registry] Failed to unregister addon: ${name} (not found)`);
    }
  }

  logMissingDependencies(name: string, missing: string[]): void {
    logger.warn(`[Registry] Addon '${name}' missing dependencies: ${missing.join(', ')}`);
  }

  logApiAccess(name: string, found: boolean): void {
    if (!found) {
      logger.debug(`[Registry] Attempted to access unknown addon: ${name}`);
    }
  }
}