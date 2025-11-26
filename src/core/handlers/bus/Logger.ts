/**
 * BUS LOGGER
 * ==========
 * Debug logging for event bus operations.
 * 
 * WHY THIS EXISTS:
 * - Centralized logging for bus events
 * - Can be enabled/disabled for debugging
 * - Consistent log formatting
 * 
 * INTERNAL USE:
 * This class is used by AddonBus internally.
 * Logs are visible when DEBUG=true in .env.
 */

import { logger } from '../../utils/logger.js';

export class BusLogger {
  private enabled: boolean;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  logEmit(event: string, hasData: boolean): void {
    if (!this.enabled) return;
    logger.debug(`[AddonBus] Event emitted: ${event}${hasData ? ' (with data)' : ''}`);
  }

  logListenerAdded(event: string, oneTime: boolean = false): void {
    if (!this.enabled) return;
    const type = oneTime ? 'One-time listener' : 'Listener';
    logger.debug(`[AddonBus] ${type} registered for: ${event}`);
  }

  logListenerRemoved(event: string): void {
    if (!this.enabled) return;
    logger.debug(`[AddonBus] Listener removed for: ${event}`);
  }

  logError(event: string, error: Error): void {
    logger.error(`[AddonBus] Error in event '${event}':`, error);
  }
  logWarn(event: string, error: Error): void {
    logger.warn(`[AddonBus] Warning in event '${event}':`, error);
  }
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}