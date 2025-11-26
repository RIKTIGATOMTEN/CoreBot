/**
 * BUS STATS COLLECTOR
 * ===================
 * Collects statistics about event bus usage.
 * 
 * WHY THIS EXISTS:
 * - Monitoring event bus activity
 * - Debugging event flow issues
 * - Performance analysis
 * 
 * STATS PROVIDED:
 * - Total number of unique events
 * - Listener count per event
 * - Total emission count
 * 
 * INTERNAL USE:
 * Access via AddonBus.getStats().
 */

import { EventManager } from './EventManager.js';
import { BusStats } from './types.js';

export class StatsCollector {
  constructor(private eventManager: EventManager) {}

  getStats(): BusStats {
    const events = this.eventManager.getAllEvents();
    const listeners: Record<string, number> = {};
    let totalEmissions = 0;

    events.forEach(event => {
      const eventName = String(event);
      listeners[eventName] = this.eventManager.getListenerCount(eventName);
      totalEmissions += this.eventManager.getEmissionCount(eventName);
    });

    return {
      totalEvents: events.length,
      listeners,
      totalEmissions
    };
  }

  getEventStats(event: string): { listeners: number; emissions: number } {
    return {
      listeners: this.eventManager.getListenerCount(event),
      emissions: this.eventManager.getEmissionCount(event)
    };
  }
}