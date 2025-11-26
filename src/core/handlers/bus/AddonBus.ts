/**
 * ADDON EVENT BUS
 * ================
 * Inter-addon communication system using events.
 * 
 * WHY THIS EXISTS:
 * - Addons need to communicate without tight coupling
 * - Event-driven architecture for loose dependencies
 * - Allows addons to react to actions in other addons
 * 
 * HOW IT WORKS:
 * - Uses Node's EventEmitter internally
 * - Events are namespaced: 'addonName:eventName'
 * - Listeners receive event data as parameter
 * - Supports one-time listeners with once()
 * 
 * USAGE IN ADDONS:
 * import { AddonBus } from '#core';
 * 
 * // Emit an event
 * AddonBus.emit('tickets', 'created', { ticketId: 123 });
 * 
 * // Listen for events
 * AddonBus.on('tickets', 'created', (data) => {
 *   console.log('Ticket created:', data.ticketId);
 * });
 * 
 * NAMESPACING:
 * Always use 'addonName:eventName' format to avoid collisions.
 * Example: 'ticketSystem:ticketCreated', 'leveling:levelUp'
 */

import { EventManager } from './EventManager.js';
import { StatsCollector } from './StatsCollector.js';
import { BusLogger } from './Logger.js';
import { BusStats, EventListener } from './types.js';
import { logger } from '../../utils/logger.js';

class AddonBusClass {
  private eventManager: EventManager;
  private statsCollector: StatsCollector;
  private busLogger: BusLogger;

  constructor() {
    this.eventManager = new EventManager(100);
    this.statsCollector = new StatsCollector(this.eventManager);
    this.busLogger = new BusLogger();
  }

  /**
   * Emit an event to all listeners using namespaced format
   * @param addonName - The addon's namespace (e.g., 'ticketSystem')
   * @param eventName - The event name (e.g., 'created')
   * @param data - Optional data to pass to listeners
   */
  emit(addonName: string, eventName?: string, data?: any): boolean {
    // Backwards compatibility: detect old-style usage
    // If eventName is undefined OR eventName looks like data (object/array/etc)
    const isOldStyle = eventName === undefined || 
                       (typeof eventName !== 'string' && eventName !== null);
    
    if (isOldStyle) {
      const eventString = addonName;
      const oldData = eventName; // This is actually the data in old-style calls
      this.busLogger.logEmit(eventString, oldData !== undefined);
      
      // Show deprecation warning
      if (!eventString.includes(':')) {
        logger.warn(
          `[AddonBus] ⚠️  DEPRECATED: emit('${eventString}') without namespace.\n` +
          `  Please migrate to: emit('myAddon', '${eventString}', data) or emitEvent('myAddon:${eventString}', data)\n` +
          `  Example: AddonBus.emit('ticketSystem', 'created', data)`
        );
      } else {
        logger.warn(
          `[AddonBus] ⚠️  DEPRECATED: emit('${eventString}', data) is old-style.\n` +
          `  Please migrate to: emitEvent('${eventString}', data)\n` +
          `  Example: AddonBus.emitEvent('ticketSystem:created', data)`
        );
      }
      
      // But still work for backwards compatibility
      try {
        return this.eventManager.emitEvent(eventString, oldData);
      } catch (error) {
        this.busLogger.logError(eventString, error as Error);
        return false;
      }
    }

    // New namespaced format
    const fullEvent = this.createNamespacedEvent(addonName, eventName);
    this.busLogger.logEmit(fullEvent, data !== undefined);
    
    try {
      return this.eventManager.emitEvent(fullEvent, data);
    } catch (error) {
      this.busLogger.logError(fullEvent, error as Error);
      return false;
    }
  }

  /**
   * Emit an event using colon notation (addonName:eventName)
   * @param namespacedEvent - Full event like 'ticketSystem:created'
   * @param data - Optional data to pass to listeners
   */
  emitEvent(namespacedEvent: string, data?: any): boolean {
    this.validateNamespacedEvent(namespacedEvent);
    this.busLogger.logEmit(namespacedEvent, data !== undefined);
    
    try {
      return this.eventManager.emitEvent(namespacedEvent, data);
    } catch (error) {
      this.busLogger.logError(namespacedEvent, error as Error);
      return false;
    }
  }

  /**
   * Listen for an event using namespaced format
   * @param addonName - The addon's namespace
   * @param eventName - The event name
   * @param listener - Callback function
   */
  on(addonName: string, eventName?: string | EventListener, listener?: EventListener): this {
    // Backwards compatibility: if second arg is function, treat as old-style
    if (typeof eventName === 'function') {
      const eventString = addonName;
      const callback = eventName;
      
      // Show deprecation warning
      if (!eventString.includes(':')) {
        logger.warn(
          `[AddonBus] ⚠️  DEPRECATED: on('${eventString}', callback) without namespace.\n` +
          `  Please migrate to: on('myAddon', '${eventString}', callback) or onEvent('myAddon:${eventString}', callback)\n` +
          `  Example: AddonBus.on('ticketSystem', 'created', handler)`
        );
      } else {
        logger.warn(
          `[AddonBus] ⚠️  DEPRECATED: on('${eventString}', callback) is old-style.\n` +
          `  Please migrate to: onEvent('${eventString}', callback)\n` +
          `  Example: AddonBus.onEvent('ticketSystem:created', handler)`
        );
      }
      
      // But still work for backwards compatibility
      this.busLogger.logListenerAdded(eventString);
      this.eventManager.addListener(eventString, callback);
      return this;
    }

    if (!eventName || !listener) {
      throw new Error('[AddonBus] on() requires addonName, eventName, and listener');
    }

    const fullEvent = this.createNamespacedEvent(addonName, eventName);
    this.busLogger.logListenerAdded(fullEvent);
    this.eventManager.addListener(fullEvent, listener);
    return this;
  }

  /**
   * Listen for an event using colon notation
   * @param namespacedEvent - Full event like 'ticketSystem:created'
   * @param listener - Callback function
   */
  onEvent(namespacedEvent: string, listener: EventListener): this {
    this.validateNamespacedEvent(namespacedEvent);
    this.busLogger.logListenerAdded(namespacedEvent);
    this.eventManager.addListener(namespacedEvent, listener);
    return this;
  }

  /**
   * Listen for an event once using namespaced format
   * @param addonName - The addon's namespace
   * @param eventName - The event name
   * @param listener - Callback function
   */
  once(addonName: string, eventName?: string | EventListener, listener?: EventListener): this {
    // Backwards compatibility: if second arg is function, treat as old-style
    if (typeof eventName === 'function') {
      const eventString = addonName;
      const callback = eventName;
      
      // Show deprecation warning
      if (!eventString.includes(':')) {
        logger.warn(
          `[AddonBus] ⚠️  DEPRECATED: once('${eventString}', callback) without namespace.\n` +
          `  Please migrate to: once('myAddon', '${eventString}', callback) or onceEvent('myAddon:${eventString}', callback)\n` +
          `  Example: AddonBus.once('ticketSystem', 'created', handler)`
        );
      } else {
        logger.warn(
          `[AddonBus] ⚠️  DEPRECATED: once('${eventString}', callback) is old-style.\n` +
          `  Please migrate to: onceEvent('${eventString}', callback)\n` +
          `  Example: AddonBus.onceEvent('ticketSystem:created', handler)`
        );
      }
      
      // But still work for backwards compatibility
      this.busLogger.logListenerAdded(eventString, true);
      this.eventManager.addOneTimeListener(eventString, callback);
      return this;
    }

    if (!eventName || !listener) {
      throw new Error('[AddonBus] once() requires addonName, eventName, and listener');
    }

    const fullEvent = this.createNamespacedEvent(addonName, eventName);
    this.busLogger.logListenerAdded(fullEvent, true);
    this.eventManager.addOneTimeListener(fullEvent, listener);
    return this;
  }

  /**
   * Listen for an event once using colon notation
   * @param namespacedEvent - Full event like 'ticketSystem:created'
   * @param listener - Callback function
   */
  onceEvent(namespacedEvent: string, listener: EventListener): this {
    this.validateNamespacedEvent(namespacedEvent);
    this.busLogger.logListenerAdded(namespacedEvent, true);
    this.eventManager.addOneTimeListener(namespacedEvent, listener);
    return this;
  }

  /**
   * Remove a listener using namespaced format
   * @param addonName - The addon's namespace
   * @param eventName - The event name
   * @param listener - Callback function to remove
   */
  off(addonName: string, eventName: string, listener: EventListener): this {
    const fullEvent = this.createNamespacedEvent(addonName, eventName);
    this.busLogger.logListenerRemoved(fullEvent);
    this.eventManager.removeListener(fullEvent, listener);
    return this;
  }

  /**
   * Remove a listener using colon notation
   * @param namespacedEvent - Full event like 'ticketSystem:created'
   * @param listener - Callback function to remove
   */
  offEvent(namespacedEvent: string, listener: EventListener): this {
    this.validateNamespacedEvent(namespacedEvent);
    this.busLogger.logListenerRemoved(namespacedEvent);
    this.eventManager.removeListener(namespacedEvent, listener);
    return this;
  }

  /**
   * Remove all listeners for an event using namespaced format
   * @param addonName - The addon's namespace (optional)
   * @param eventName - The event name (optional)
   */
  removeAllListeners(addonName?: string, eventName?: string): this {
    if (addonName && eventName) {
      const fullEvent = this.createNamespacedEvent(addonName, eventName);
      this.eventManager.removeAllListeners(fullEvent);
    } else if (addonName) {
      // Remove all events for this addon namespace
      const events = this.getEventNames();
      const prefix = `${addonName}:`;
      events
        .filter(e => e.startsWith(prefix))
        .forEach(e => this.eventManager.removeAllListeners(e));
    } else {
      this.eventManager.removeAllListeners();
    }
    return this;
  }

  /**
   * Remove all listeners for a specific namespaced event
   * @param namespacedEvent - Full event like 'ticketSystem:created' or undefined for all
   */
  removeAllListenersForEvent(namespacedEvent?: string): this {
    if (namespacedEvent) {
      this.validateNamespacedEvent(namespacedEvent);
    }
    this.eventManager.removeAllListeners(namespacedEvent);
    return this;
  }

  /**
   * Get all events for a specific addon
   * @param addonName - The addon's namespace
   * @returns Array of event names (without the namespace prefix)
   */
  getAddonEvents(addonName: string): string[] {
    const prefix = `${addonName}:`;
    return this.getEventNames()
      .filter(e => e.startsWith(prefix))
      .map(e => e.substring(prefix.length));
  }

  /**
   * Get all unique addon namespaces that have events
   * @returns Array of addon names
   */
  getAddonNames(): string[] {
    const namespaces = new Set<string>();
    
    this.getEventNames().forEach(event => {
      const [addonName] = event.split(':');
      if (addonName) namespaces.add(addonName);
    });
    
    return Array.from(namespaces);
  }

  /**
   * Get stats about the bus
   */
  getStats(): BusStats {
    return this.statsCollector.getStats();
  }

  /**
   * Get stats for a specific event using namespaced format
   */
  getEventStats(addonName: string, eventName: string) {
    const fullEvent = this.createNamespacedEvent(addonName, eventName);
    return this.statsCollector.getEventStats(fullEvent);
  }

  /**
   * Get stats for a specific namespaced event
   */
  getEventStatsByKey(namespacedEvent: string) {
    this.validateNamespacedEvent(namespacedEvent);
    return this.statsCollector.getEventStats(namespacedEvent);
  }

  /**
   * Clear emission statistics
   */
  clearStats(): void {
    this.eventManager.clearEmissionStats();
  }

  /**
   * Enable or disable debug logging
   */
  setLogging(enabled: boolean): void {
    this.busLogger.setEnabled(enabled);
  }

  /**
   * Get list of all registered events (in namespaced format)
   */
  getEventNames(): string[] {
    return this.eventManager.getAllEvents().map(String);
  }

  /**
   * Create a namespaced event key (addonName:eventName)
   */
  private createNamespacedEvent(addonName: string, eventName: string): string {
    this.validateNamespacePart(addonName, 'addonName');
    this.validateNamespacePart(eventName, 'eventName');
    return `${addonName}:${eventName}`;
  }

  /**
   * Validate a full namespaced event string
   */
  private validateNamespacedEvent(namespacedEvent: string): void {
    if (!namespacedEvent || typeof namespacedEvent !== 'string') {
      throw new Error('[AddonBus] Event must be a non-empty string');
    }
    if (!namespacedEvent.includes(':')) {
      throw new Error(`[AddonBus] Event must be namespaced (format: addonName:eventName): ${namespacedEvent}`);
    }
    const [addonName, eventName] = namespacedEvent.split(':');
    this.validateNamespacePart(addonName, 'addonName');
    this.validateNamespacePart(eventName, 'eventName');
  }

  /**
   * Validate namespace parts don't contain invalid characters
   */
  private validateNamespacePart(part: string, paramName: string): void {
    if (!part || typeof part !== 'string') {
      throw new Error(`[AddonBus] ${paramName} must be a non-empty string`);
    }
    if (part.includes(':')) {
      throw new Error(`[AddonBus] ${paramName} cannot contain colons: ${part}`);
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(part)) {
      throw new Error(`[AddonBus] ${paramName} can only contain letters, numbers, underscores, and hyphens: ${part}`);
    }
  }
}

export const AddonBus = new AddonBusClass();
export type { BusStats, EventListener, BusEvent } from './types.js';