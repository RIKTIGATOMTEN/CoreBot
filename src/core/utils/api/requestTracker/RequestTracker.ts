/**
 * REQUEST TRACKER
 * ===============
 * Prevents duplicate concurrent requests.
 * 
 * WHY THIS EXISTS:
 * - Users may double-click buttons
 * - Prevents duplicate ticket creation, payments, etc.
 * - Automatic cleanup after request completes
 * 
 * HOW IT WORKS:
 * - isProcessing(): Check if request is in progress
 * - mark(): Mark request as in progress
 * - release(): Mark request as complete
 * - wrap(): Automatically mark/release around function
 * 
 * USAGE:
 * import { requestTracker } from '#core';
 * 
 * await requestTracker.wrap(userId, 'createTicket', async () => {
 *   await createTicket();
 * });
 * 
 * // Or manual control:
 * if (requestTracker.isProcessing(userId, 'createTicket')) {
 *   return reply('Please wait...');
 * }
 */

import { logger } from '../../logger.js';
import { RequestStore } from './RequestStore.js';
import { KeyBuilder } from './KeyBuilder.js';
import { DEFAULT_DURATION } from '../constants.js';
import { WrapOptions, RequestStats, ActiveRequest } from '../types.js';

export class RequestTracker {
  private store: RequestStore;
  private defaultDuration: number;

  constructor() {
    this.store = new RequestStore();
    this.defaultDuration = DEFAULT_DURATION;
  }

  isProcessing(userId: string, action: string, data: string = ''): boolean {
    const key = KeyBuilder.build(userId, action, data);
    
    if (this.store.has(key)) {
      const startTime = this.store.get(key)!;
      const elapsed = Date.now() - startTime;
      logger.debug(`Request already processing: ${key} (${elapsed}ms elapsed)`);
      return true;
    }
    
    return false;
  }

  mark(userId: string, action: string, duration: number = this.defaultDuration, data: string = ''): void {
    const key = KeyBuilder.build(userId, action, data);
    this.store.set(key, Date.now());
    logger.debug(`Marked as processing: ${key} (${duration}ms)`);
    
    setTimeout(() => {
      this.store.delete(key);
      logger.debug(`Cleaned up: ${key}`);
    }, duration);
  }

  release(userId: string, action: string, data: string = ''): void {
    const key = KeyBuilder.build(userId, action, data);
    const existed = this.store.delete(key);
    
    if (existed) {
      logger.debug(`🔓 Released: ${key}`);
    }
  }

  async wrap<T>(
    userId: string,
    action: string,
    fn: () => Promise<T>,
    options: WrapOptions = {}
  ): Promise<T | null> {
    const {
      duration = this.defaultDuration,
      data = '',
      throwOnDuplicate = true
    } = options;

    if (this.isProcessing(userId, action, data)) {
      if (throwOnDuplicate) {
        throw new Error('Request already being processed');
      }
      return null;
    }

    this.mark(userId, action, duration, data);
    
    try {
      return await fn();
    } finally {
      this.release(userId, action, data);
    }
  }

  getActive(): ActiveRequest[] {
    return this.store.getAll();
  }

  clear(): void {
    const count = this.store.clear();
    logger.warn(`⚠️ Cleared ${count} tracked requests`);
  }

  getStats(): RequestStats {
    return {
      active: this.store.size(),
      requests: this.store.getKeys()
    };
  }
}