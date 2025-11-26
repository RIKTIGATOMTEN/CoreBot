/**
 * ADDON REGISTRY
 * ==============
 * Central registry for addon APIs and cross-addon communication.
 * 
 * WHY THIS EXISTS:
 * - Addons can expose APIs for other addons to use
 * - Decouples addons while allowing interaction
 * - Tracks addon dependencies
 * - Provides addon discovery and stats
 * 
 * HOW IT WORKS:
 * - register() stores an addon's public API
 * - get() retrieves another addon's API
 * - Uses namespaced keys: 'addonName.exportName'
 * - Supports dependency checking
 * 
 * USAGE IN ADDONS:
 * import { AddonRegistry } from '#core';
 * 
 * // Register your API
 * AddonRegistry.register('myAddon', 'api', {
 *   doSomething: () => { ... },
 *   getData: () => { ... }
 * });
 * 
 * // Use another addon's API
 * const ticketApi = AddonRegistry.get('tickets', 'api');
 * if (ticketApi) {
 *   ticketApi.createTicket(userId);
 * }
 * 
 * BEST PRACTICES:
 * - Check if addon exists before using: isLoaded('addonName', 'api')
 * - Declare dependencies in metadata for load ordering
 */

import { AddonStore } from './AddonStore.js';
import { RegistryStatsCollector } from './StatsCollector.js';
import { DependencyResolver } from './DependencyResolver.js';
import { RegistryLogger } from './Logger.js';
import { AddonMetadata, RegistryStats, AddonInfo } from './types.js';
import { logger } from '../../utils/logger.js';

class AddonRegistryClass {
  private store: AddonStore;
  private statsCollector: RegistryStatsCollector;
  private dependencyResolver: DependencyResolver;
  private registryLogger: RegistryLogger;

  constructor() {
    this.store = new AddonStore();
    this.statsCollector = new RegistryStatsCollector(this.store);
    this.dependencyResolver = new DependencyResolver(this.store);
    this.registryLogger = new RegistryLogger();
  }

  /**
   * Register an addon with its public API using namespaced format
   * @param addonName - The addon's unique namespace (e.g., 'ticketSystem')
   * @param exportName - The export name (e.g., 'api' or 'tickets')
   * @param api - The actual API object/function to expose
   * @param metadata - Optional metadata about the addon
   */
  register(addonName: string, exportName?: string | any, api?: any, metadata?: AddonMetadata): void {
    // Backwards compatibility: if only 2 args and second is not a string, treat as old-style
    if (arguments.length === 2 || (typeof exportName !== 'string' && api === undefined)) {
      const oldName = addonName;
      const oldApi = exportName;
      
      logger.warn(
        `[Registry] ⚠️  DEPRECATED: register('${oldName}', api) is old-style.\n` +
        `  Please migrate to: register('${oldName}', 'api', api)\n` +
        `  Example: AddonRegistry.register('myAddon', 'api', myAPI)`
      );
      
      // Still work for backwards compatibility - store with .api suffix
      const fullName = `${oldName}.api`;
      const isOverwrite = this.store.has(fullName);
      if (isOverwrite) {
        logger.warn(`[Registry] Addon '${fullName}' is already registered, overwriting...`);
      } else {
        logger.debug(`[Registry] Registered addon: ${fullName}`);
      }
      
      this.store.add(fullName, oldApi, { addonName: oldName, exportName: 'api' });
      return;
    }

    if (!exportName || typeof exportName !== 'string') {
      throw new Error('[Registry] register() requires addonName (string), exportName (string), and api');
    }

    const fullName = this.createNamespacedKey(addonName, exportName);
    const isOverwrite = this.store.has(fullName);
    this.registryLogger.logRegister(fullName, isOverwrite);

    // Check dependencies if provided
    if (metadata?.dependencies) {
      const check = this.dependencyResolver.checkDependencies(metadata.dependencies);
      if (!check.satisfied) {
        this.registryLogger.logMissingDependencies(fullName, check.missing);
      }
    }

    this.store.add(fullName, api, { ...metadata, addonName, exportName });
  }

  /**
   * Get an addon's public API using namespaced format
   * @param addonName - The addon's namespace
   * @param exportName - The export name
   * @returns The registered API or undefined
   */
  get(addonName: string, exportName?: string): any | undefined {
    // Warn if trying to use old single-parameter style
    if (exportName === undefined) {
      logger.warn(
        `[Registry] ⚠️  DEPRECATED: get('${addonName}') without exportName is no longer supported.\n` +
        `Please use namespaced format: get('${addonName}', 'api') or getByKey('${addonName}.api')\n` +
        `Example: AddonRegistry.get('myAddon', 'api')`
      );
      // Try to be helpful - check if it looks like a namespaced key
      if (addonName.includes('.')) {
        logger.info(`[Registry] 💡 Hint: Use getByKey('${addonName}') for dot notation`);
        return this.getByKey(addonName);
      }
      return undefined;
    }

    const fullName = this.createNamespacedKey(addonName, exportName);
    const addon = this.store.get(fullName);
    this.registryLogger.logApiAccess(fullName, !!addon);
    return addon?.api;
  }

  /**
   * Get an addon's public API using dot notation
   * @param namespacedKey - Full key like 'ticketSystem.api'
   * @returns The registered API or undefined
   */
  getByKey(namespacedKey: string): any | undefined {
    const addon = this.store.get(namespacedKey);
    this.registryLogger.logApiAccess(namespacedKey, !!addon);
    return addon?.api;
  }

  /**
   * Check if addon export is loaded
   * @param addonName - The addon's namespace
   * @param exportName - The export name
   */
  isLoaded(addonName: string, exportName?: string): boolean {
    // Backwards compatibility: if only one arg, try to find .api export
    if (exportName === undefined) {
      logger.warn(
        `[Registry] ⚠️  DEPRECATED: isLoaded('${addonName}') without exportName.\n` +
        `  Please migrate to: isLoaded('${addonName}', 'api')\n` +
        `  Example: AddonRegistry.isLoaded('myAddon', 'api')`
      );
      
      // Try old-style lookup
      const fullName = `${addonName}.api`;
      return this.store.has(fullName);
    }
    
    const fullName = this.createNamespacedKey(addonName, exportName);
    return this.store.has(fullName);
  }

  /**
   * Check if a namespaced key exists
   * @param namespacedKey - Full key like 'ticketSystem.api'
   */
  isLoadedByKey(namespacedKey: string): boolean {
    return this.store.has(namespacedKey);
  }

  /**
   * Get all registered exports for a specific addon
   * @param addonName - The addon's namespace
   * @returns Array of export names
   */
  getAddonExports(addonName: string): string[] {
    const allNames = this.store.getAllNames();
    return allNames
      .filter(name => name.startsWith(`${addonName}.`))
      .map(name => name.split('.')[1]);
  }

  /**
   * Get all unique addon namespaces
   * @returns Array of addon names
   */
  getAddonNames(): string[] {
    const allNames = this.store.getAllNames();
    const namespaces = new Set<string>();
    
    allNames.forEach(name => {
      const [addonName] = name.split('.');
      if (addonName) namespaces.add(addonName);
    });
    
    return Array.from(namespaces);
  }

  /**
   * Get all registered namespaced keys (addonName.exportName)
   */
  getAll(): string[] {
    return this.store.getAllNames();
  }

  /**
   * Unregister a specific addon export
   * @param addonName - The addon's namespace
   * @param exportName - The export name
   */
  unregister(addonName: string, exportName?: string): boolean {
    // Backwards compatibility: if only one arg, try to remove .api export
    if (exportName === undefined) {
      logger.warn(
        `[Registry] ⚠️  DEPRECATED: unregister('${addonName}') without exportName.\n` +
        `  Please migrate to: unregister('${addonName}', 'api')\n` +
        `  Example: AddonRegistry.unregister('myAddon', 'api')`
      );
      
      // Try old-style removal
      const fullName = `${addonName}.api`;
      const removed = this.store.remove(fullName);
      this.registryLogger.logUnregister(fullName, removed);
      return removed;
    }
    
    const fullName = this.createNamespacedKey(addonName, exportName);
    const removed = this.store.remove(fullName);
    this.registryLogger.logUnregister(fullName, removed);
    return removed;
  }

  /**
   * Unregister all exports for an addon
   * @param addonName - The addon's namespace
   * @returns Number of exports removed
   */
  unregisterAddon(addonName: string): number {
    const exports = this.getAddonExports(addonName);
    let count = 0;
    
    exports.forEach(exportName => {
      if (this.unregister(addonName, exportName)) {
        count++;
      }
    });
    
    logger.info(`[Registry] Unregistered ${count} export(s) from addon: ${addonName}`);
    return count;
  }

  /**
   * Get registry stats
   */
  getStats(): RegistryStats {
    return this.statsCollector.getStats();
  }

  /**
   * Get info about a specific addon export
   */
  getAddonInfo(addonName: string, exportName?: string): AddonInfo | null {
    // Backwards compatibility: if only one arg, try to find .api export
    if (exportName === undefined) {
      logger.warn(
        `[Registry] ⚠️  DEPRECATED: getAddonInfo('${addonName}') without exportName.\n` +
        `  Please migrate to: getAddonInfo('${addonName}', 'api')\n` +
        `  Example: AddonRegistry.getAddonInfo('myAddon', 'api')`
      );
      
      // Try to retrieve as old-style (addonName.api)
      const fullName = `${addonName}.api`;
      return this.statsCollector.getAddonInfo(fullName);
    }
    
    const fullName = this.createNamespacedKey(addonName, exportName);
    return this.statsCollector.getAddonInfo(fullName);
  }

  /**
   * Check dependencies for an addon (expects namespaced dependencies)
   */
  checkDependencies(dependencies: string[]): { 
    satisfied: boolean; 
    missing: string[] 
  } {
    return this.dependencyResolver.checkDependencies(dependencies);
  }

  /**
   * Get all addons that depend on a specific addon export
   */
  getDependents(addonName: string, exportName?: string): string[] {
    // Backwards compatibility: if only one arg, try .api export
    if (exportName === undefined) {
      logger.warn(
        `[Registry] ⚠️  DEPRECATED: getDependents('${addonName}') without exportName.\n` +
        `  Please migrate to: getDependents('${addonName}', 'api')\n` +
        `  Example: AddonRegistry.getDependents('myAddon', 'api')`
      );
      
      const fullName = `${addonName}.api`;
      return this.dependencyResolver.getDependents(fullName);
    }
    
    const fullName = this.createNamespacedKey(addonName, exportName);
    return this.dependencyResolver.getDependents(fullName);
  }

  /**
   * Clear all registered addons (use with caution)
   */
  clear(): void {
    this.store.clear();
    logger.warn('[Registry] All addons cleared from registry');
  }

  /**
   * Create a namespaced key from addon and export names
   */
  private createNamespacedKey(addonName: string, exportName: string): string {
    this.validateNamespacePart(addonName, 'addonName');
    this.validateNamespacePart(exportName, 'exportName');
    return `${addonName}.${exportName}`;
  }

  /**
   * Validate namespace parts don't contain dots or invalid characters
   */
  private validateNamespacePart(part: string, paramName: string): void {
    if (!part || typeof part !== 'string') {
      throw new Error(`[Registry] ${paramName} must be a non-empty string`);
    }
    if (part.includes('.')) {
      throw new Error(`[Registry] ${paramName} cannot contain dots: ${part}`);
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(part)) {
      throw new Error(`[Registry] ${paramName} can only contain letters, numbers, underscores, and hyphens: ${part}`);
    }
  }
}

export const AddonRegistry = new AddonRegistryClass();
export type { RegisteredAddon, AddonMetadata, RegistryStats, AddonInfo } from './types.js';