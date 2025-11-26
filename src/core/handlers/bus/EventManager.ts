/**
 * EVENT MANAGER
 * =============
 * Core event emitter with emission tracking.
 * 
 * WHY THIS EXISTS:
 * - Extends Node's EventEmitter with tracking
 * - Counts emissions per event for debugging
 * - Provides cleaner method names
 * 
 * HOW IT WORKS:
 * - Wraps EventEmitter with additional features
 * - Tracks emission count per event name
 * - Provides stats for monitoring
 * 
 * INTERNAL USE:
 * This class is used by AddonBus internally.
 * Addons should use AddonBus, not EventManager directly.
 */

import { EventEmitter } from 'events';
import { EventListener } from './types.js';

export class EventManager extends EventEmitter {
  private emissionCount: Map<string, number> = new Map();

  constructor(maxListeners: number = 100) {
    super();
    this.setMaxListeners(maxListeners);
  }

  emitEvent(event: string, data?: any): boolean {
    this.incrementEmissionCount(event);
    return super.emit(event, data);
  }

  addListener(event: string, listener: EventListener): this {
    return super.on(event, listener);
  }

  addOneTimeListener(event: string, listener: EventListener): this {
    return super.once(event, listener);
  }

  removeListener(event: string, listener: EventListener): this {
    return super.off(event, listener);
  }

  removeAllListeners(event?: string): this {
    return super.removeAllListeners(event);
  }

  getListenerCount(event: string): number {
    return this.listenerCount(event);
  }

  getAllEvents(): (string | symbol)[] {
    return this.eventNames();
  }

  getEmissionCount(event: string): number {
    return this.emissionCount.get(event) || 0;
  }

  private incrementEmissionCount(event: string): void {
    const count = this.emissionCount.get(event) || 0;
    this.emissionCount.set(event, count + 1);
  }

  clearEmissionStats(): void {
    this.emissionCount.clear();
  }
}