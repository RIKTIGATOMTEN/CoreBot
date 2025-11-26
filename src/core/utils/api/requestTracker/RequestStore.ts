/**
 * REQUEST STORE
 * =============
 * In-memory storage for active request tracking.
 * 
 * WHY THIS EXISTS:
 * - Tracks which requests are currently processing
 * - Stores start timestamp for elapsed time calculation
 * - Provides list of all active requests
 * 
 * INTERNAL USE:
 * Used by RequestTracker to store processing state.
 */

import { ActiveRequest } from '../types.js';

export class RequestStore {
  private processing: Map<string, number> = new Map();

  has(key: string): boolean {
    return this.processing.has(key);
  }

  get(key: string): number | undefined {
    return this.processing.get(key);
  }

  set(key: string, timestamp: number): void {
    this.processing.set(key, timestamp);
  }

  delete(key: string): boolean {
    return this.processing.delete(key);
  }

  clear(): number {
    const count = this.processing.size;
    this.processing.clear();
    return count;
  }

  getAll(): ActiveRequest[] {
    const active: ActiveRequest[] = [];
    const now = Date.now();
    
    for (const [key, startTime] of this.processing) {
      active.push({
        key,
        elapsed: now - startTime
      });
    }
    
    return active;
  }

  getKeys(): string[] {
    return Array.from(this.processing.keys());
  }

  size(): number {
    return this.processing.size;
  }
}