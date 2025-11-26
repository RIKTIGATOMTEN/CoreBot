/**
 * RATE LIMIT STORE
 * ================
 * In-memory storage for rate limit entries.
 * 
 * WHY THIS EXISTS:
 * - Simple Map wrapper for limit tracking
 * - Stores count, resetAt, and limit per key
 * - Provides iteration for cleanup
 * 
 * INTERNAL USE:
 * Used by UserLimiter to store rate limit data.
 */

import { RateLimit } from '../types.js';

interface LimitEntry {
  count: number;
  resetAt: number;
  limit: RateLimit;
}

export class LimitStore {
  private limits: Map<string, LimitEntry> = new Map();

  has(key: string): boolean {
    return this.limits.has(key);
  }

  get(key: string): LimitEntry | undefined {
    return this.limits.get(key);
  }

  set(key: string, entry: LimitEntry): void {
    this.limits.set(key, entry);
  }

  delete(key: string): boolean {
    return this.limits.delete(key);
  }

  clear(): number {
    const count = this.limits.size;
    this.limits.clear();
    return count;
  }

  entries(): IterableIterator<[string, LimitEntry]> {
    return this.limits.entries();
  }

  keys(): IterableIterator<string> {
    return this.limits.keys();
  }

  size(): number {
    return this.limits.size;
  }
}