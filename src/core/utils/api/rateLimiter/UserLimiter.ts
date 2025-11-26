/**
 * USER RATE LIMITER
 * =================
 * Per-user rate limiting for actions.
 * 
 * WHY THIS EXISTS:
 * - Prevents users from spamming buttons/commands
 * - Configurable limits per action type
 * - Automatic cleanup of expired entries
 * 
 * HOW IT WORKS:
 * - Tracks request count per user+action key
 * - Resets count after time window expires
 * - Returns remaining requests and retry time
 * 
 * USAGE:
 * import { userLimiter } from '#core';
 * 
 * const result = userLimiter.check(userId, 'button:click');
 * if (!result.allowed) {
 *   reply(`Rate limited. Try again in ${result.retryAfter}s`);
 * }
 * 
 * CUSTOM LIMITS:
 * userLimiter.setLimit('myAction', 5, 10000); // 5 per 10s
 */

import { logger } from '../../logger.js';
import { LimitStore } from './LimitStore.js';
import { LimitConfig } from './LimitConfig.js';
import { Cleaner } from './Cleaner.js';
import { RateLimit, RateLimitResult, RateLimitStatus, LimiterStats } from '../types.js';

export class UserLimiter {
  private store: LimitStore;
  private config: LimitConfig;
  private cleaner: Cleaner;

  constructor() {
    this.store = new LimitStore();
    this.config = new LimitConfig();
    this.cleaner = new Cleaner(this.store);
    this.cleaner.start();
  }

  check(userId: string, action: string, customLimit: RateLimit | null = null): RateLimitResult {
    const key = `${userId}:${action}`;
    const limit = this.config.getLimit(action, customLimit);

    if (!this.store.has(key)) {
      this.store.set(key, {
        count: 0,
        resetAt: Date.now() + limit.window,
        limit: limit
      });
    }

    const entry = this.store.get(key)!;
    const now = Date.now();

    if (now >= entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + limit.window;
    }

    if (entry.count >= limit.max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      logger.debug(`🚫 Rate limit hit: ${key} (retry in ${retryAfter}s)`);
      
      return {
        allowed: false,
        remaining: 0,
        retryAfter: retryAfter,
        resetAt: entry.resetAt
      };
    }

    entry.count++;
    const remaining = limit.max - entry.count;
    logger.debug(`Rate limit passed: ${key} (${remaining} remaining)`);

    return {
      allowed: true,
      remaining: remaining,
      retryAfter: 0,
      resetAt: entry.resetAt
    };
  }

  setLimit(action: string, max: number, window: number): void {
    this.config.setCustomLimit(action, { max, window });
    logger.info(`Custom limit set: ${action} → ${max} per ${window}ms`);
  }

  reset(userId: string, action: string | null = null): void {
    if (action) {
      const key = `${userId}:${action}`;
      this.store.delete(key);
      logger.debug(`Reset limit: ${key}`);
    } else {
      let count = 0;
      for (const key of this.store.keys()) {
        if (key.startsWith(`${userId}:`)) {
          this.store.delete(key);
          count++;
        }
      }
      logger.debug(`Reset ${count} limits for user: ${userId}`);
    }
  }

  getStatus(userId: string, action: string): RateLimitStatus | null {
    const key = `${userId}:${action}`;
    const entry = this.store.get(key);
    
    if (!entry) return null;

    const now = Date.now();
    const resetIn = Math.max(0, entry.resetAt - now);

    return {
      count: entry.count,
      max: entry.limit.max,
      remaining: entry.limit.max - entry.count,
      resetIn: Math.ceil(resetIn / 1000),
      resetAt: entry.resetAt
    };
  }

  getStats(): LimiterStats {
    const activeUsers = new Set<string>();
    const byAction: { [key: string]: number } = {};

    for (const key of this.store.keys()) {
      const [userId, action] = key.split(':');
      activeUsers.add(userId);
      
      if (!byAction[action]) {
        byAction[action] = 0;
      }
      byAction[action]++;
    }

    return {
      totalEntries: this.store.size(),
      activeUsers: activeUsers.size,
      byAction: byAction
    };
  }

  clear(): void {
    const count = this.store.clear();
    logger.warn(`⚠️ Cleared ${count} rate limit entries`);
  }
}