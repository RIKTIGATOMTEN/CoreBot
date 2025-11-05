import logger from '../logger.js';

interface RateLimit {
  max: number;
  window: number;
}

class UserLimiter {
  private limits: Map<string, {
    count: number;
    resetAt: number;
    limit: RateLimit;
  }>;
  private defaultLimits: { [key: string]: RateLimit };
  private customLimits: Map<string, RateLimit>;

  private cleanupInterval?: NodeJS.Timeout;

  constructor() {
    this.limits = new Map();

    // Default limits (can be overridden)
    this.defaultLimits = {
      'ticket:create': { max: 3, window: 60000 },        // 3 per minute
      'ticket:close': { max: 5, window: 30000 },         // 5 per 30 seconds
      'button:click': { max: 10, window: 5000 },         // 10 per 5 seconds
      'command:use': { max: 20, window: 10000 },         // 20 per 10 seconds
      'message:send': { max: 5, window: 5000 },          // 5 per 5 seconds
    };

    // Custom limits (set by addons)
    this.customLimits = new Map();

    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Check if user is rate limited for an action
   * @param {string} userId - User ID
   * @param {string} action - Action identifier
   * @param {Object} [customLimit] - Override default limit
   * @returns {Object} { allowed: boolean, remaining: number, retryAfter: number }
   */
  public check(userId: string, action: string, customLimit: RateLimit | null = null) {
    const key = `${userId}:${action}`;
    const limit = customLimit || this.customLimits.get(action) || this.defaultLimits[action] || { max: 5, window: 5000 };

    // Get or create limit entry
    if (!this.limits.has(key)) {
      this.limits.set(key, {
        count: 0,
        resetAt: Date.now() + limit.window,
        limit: limit
      });
    }

    const entry = this.limits.get(key)!;
    const now = Date.now();

    // Reset if window expired
    if (now >= entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + limit.window;
    }

    // Check if over limit
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

    // Increment count
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

  /**
   * Set a custom limit for an action
   * @param {string} action - Action identifier
   * @param {number} max - Maximum requests
   * @param {number} window - Time window in milliseconds
   */
  public setLimit(action: string, max: number, window: number): void {
    this.customLimits.set(action, { max, window });
    logger.info(`Custom limit set: ${action} → ${max} per ${window}ms`);
  }

  /**
   * Reset limits for a specific user and action
   * @param {string} userId - User ID
   * @param {string} [action] - Action identifier (optional, resets all if not provided)
   */
  public reset(userId: string, action: string | null = null): void {
    if (action) {
      const key = `${userId}:${action}`;
      this.limits.delete(key);
      logger.debug(`Reset limit: ${key}`);
    } else {
      // Reset all limits for user
      let count = 0;
      for (const key of this.limits.keys()) {
        if (key.startsWith(`${userId}:`)) {
          this.limits.delete(key);
          count++;
        }
      }
      logger.debug(`Reset ${count} limits for user: ${userId}`);
    }
  }

  /**
   * Get current limit status for a user and action
   * @param {string} userId - User ID
   * @param {string} action - Action identifier
   * @returns {Object|null}
   */
  public getStatus(userId: string, action: string) {
    const key = `${userId}:${action}`;
    const entry = this.limits.get(key);

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

  /**
   * Cleanup expired entries (prevent memory leak)
   * @private
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.limits) {
      // Remove entries that expired more than 1 minute ago
      if (now > entry.resetAt + 60000) {
        this.limits.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  }

  /**
   * Start automatic cleanup
   * @private
   */
  private startCleanup(): void {
    // Cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 300000);
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  public getStats() {
    const activeUsers = new Set<string>();
    const byAction: { [key: string]: number } = {};

    for (const key of this.limits.keys()) {
      const [userId, action] = key.split(':');
      activeUsers.add(userId);

      if (!byAction[action]) {
        byAction[action] = 0;
      }
      byAction[action]++;
    }

    return {
      totalEntries: this.limits.size,
      activeUsers: activeUsers.size,
      byAction: byAction
    };
  }

  /**
   * Clear all limits (use with caution!)
   */
  public clear(): void {
    const count = this.limits.size;
    this.limits.clear();
    logger.warn(`⚠️ Cleared ${count} rate limit entries`);
  }
}

// Singleton instance
const userLimiter = new UserLimiter();

export default userLimiter;
export { UserLimiter };