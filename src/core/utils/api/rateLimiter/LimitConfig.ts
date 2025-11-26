/**
 * RATE LIMIT CONFIG
 * =================
 * Manages rate limit configurations per action.
 * 
 * WHY THIS EXISTS:
 * - Different actions need different limits
 * - Supports custom limits set at runtime
 * - Falls back to DEFAULT_LIMITS
 * 
 * INTERNAL USE:
 * Used by UserLimiter to get limits for actions.
 */

import { RateLimit } from '../types.js';
import { DEFAULT_LIMITS } from '../constants.js';

export class LimitConfig {
  private customLimits: Map<string, RateLimit> = new Map();

  getLimit(action: string, customLimit?: RateLimit | null): RateLimit {
    if (customLimit) return customLimit;
    if (this.customLimits.has(action)) return this.customLimits.get(action)!;
    return DEFAULT_LIMITS[action] || { max: 5, window: 5000 };
  }

  setCustomLimit(action: string, limit: RateLimit): void {
    this.customLimits.set(action, limit);
  }

  hasCustomLimit(action: string): boolean {
    return this.customLimits.has(action);
  }
}