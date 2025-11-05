import logger from '../logger.js';

interface WrapOptions {
  duration?: number;
  data?: string;
  throwOnDuplicate?: boolean;
}

class RequestTracker {
  private processing: Map<string, number>;
  private defaultDuration: number;

  constructor() {
    this.processing = new Map();
    this.defaultDuration = 5000; // 5 seconds default
  }

  /**
   * Check if a request is currently being processed
   * @param {string} userId - User ID
   * @param {string} action - Action identifier (e.g., 'ticket:create')
   * @param {string} [data=''] - Optional additional data for uniqueness
   * @returns {boolean}
   */
  public isProcessing(userId: string, action: string, data: string = ''): boolean {
    const key = this.getKey(userId, action, data);
    
    if (this.processing.has(key)) {
      const startTime = this.processing.get(key)!;
      const elapsed = Date.now() - startTime;
      
      logger.debug(`Request already processing: ${key} (${elapsed}ms elapsed)`);
      return true;
    }
    
    return false;
  }

  /**
   * Mark a request as being processed
   * @param {string} userId - User ID
   * @param {string} action - Action identifier
   * @param {number} [duration] - How long to mark as processing (ms)
   * @param {string} [data=''] - Optional additional data
   */
  public mark(userId: string, action: string, duration: number = this.defaultDuration, data: string = ''): void {
    const key = this.getKey(userId, action, data);
    this.processing.set(key, Date.now());
    
    logger.debug(`Marked as processing: ${key} (${duration}ms)`);
    
    // Auto-cleanup after duration
    setTimeout(() => {
      this.processing.delete(key);
      logger.debug(`Cleaned up: ${key}`);
    }, duration);
  }

  /**
   * Manually release a request (use in finally blocks)
   * @param {string} userId - User ID
   * @param {string} action - Action identifier
   * @param {string} [data=''] - Optional additional data
   */
  public release(userId: string, action: string, data: string = ''): void {
    const key = this.getKey(userId, action, data);
    const existed = this.processing.delete(key);
    
    if (existed) {
      logger.debug(`🔓 Released: ${key}`);
    }
  }

  /**
   * Wrap a function with request tracking
   * Automatically marks as processing and releases when done
   * @param {string} userId - User ID
   * @param {string} action - Action identifier
   * @param {Function} fn - Function to execute
   * @param {Object} [options={}] - Options
   * @returns {Promise<any>}
   */
  public async wrap<T>(userId: string, action: string, fn: () => Promise<T>, options: WrapOptions = {}): Promise<T | null> {
    const {
      duration = this.defaultDuration,
      data = '',
      throwOnDuplicate = true
    } = options as WrapOptions;

    // Check if already processing
    if (this.isProcessing(userId, action, data)) {
      if (throwOnDuplicate) {
        throw new Error('Request already being processed');
      }
      return null;
    }

    // Mark as processing
    this.mark(userId, action, duration, data);

    try {
      // Execute the function
      const result = await fn();
      return result;
    } finally {
      // Always release, even on error
      this.release(userId, action, data);
    }
  }

  /**
   * Get unique key for tracking
   * @private
   */
  private getKey(userId: string, action: string, data: string): string {
    return data ? `${userId}:${action}:${data}` : `${userId}:${action}`;
  }

  /**
   * Get all currently processing requests (for debugging)
   * @returns {Array}
   */
  public getActive(): { key: string; elapsed: number }[] {
    const active = [];
    for (const [key, startTime] of this.processing) {
      active.push({
        key,
        elapsed: Date.now() - startTime
      });
    }
    return active;
  }

  /**
   * Clear all tracked requests (use with caution!)
   */
  public clear(): void {
    const count = this.processing.size;
    this.processing.clear();
    logger.warn(`⚠️ Cleared ${count} tracked requests`);
  }

  /**
   * Get statistics
   * @returns {Object}
   */
  public getStats(): { active: number; requests: string[] } {
    return {
      active: this.processing.size,
      requests: Array.from(this.processing.keys())
    };
  }
}

// Singleton instance
const requestTracker = new RequestTracker();

export default requestTracker;
export { RequestTracker };