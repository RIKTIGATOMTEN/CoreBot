/**
 * RATE LIMIT CLEANER
 * ==================
 * Periodically cleans up expired rate limit entries.
 * 
 * WHY THIS EXISTS:
 * - Prevents memory leaks from old entries
 * - Runs every 5 minutes (CLEANUP_INTERVAL)
 * - Removes entries 1 minute after expiry (GRACE_PERIOD)
 * 
 * INTERNAL USE:
 * Started automatically by UserLimiter.
 */

import { logger } from '../../logger.js';
import { LimitStore } from './LimitStore.js';
import { CLEANUP_INTERVAL, CLEANUP_GRACE_PERIOD } from '../constants.js';

export class Cleaner {
  private store: LimitStore;
  private interval?: NodeJS.Timeout;

  constructor(store: LimitStore) {
    this.store = store;
  }

  start(): void {
    this.interval = setInterval(() => {
      this.cleanup();
    }, CLEANUP_INTERVAL);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetAt + CLEANUP_GRACE_PERIOD) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }
}