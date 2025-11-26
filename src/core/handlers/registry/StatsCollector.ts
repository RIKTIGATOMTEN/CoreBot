/**
 * REGISTRY STATS COLLECTOR
 * ========================
 * Collects statistics about registered addons.
 * 
 * WHY THIS EXISTS:
 * - Monitoring addon registrations
 * - Debugging addon loading issues
 * - Provides uptime and metadata info
 * 
 * STATS PROVIDED:
 * - Total number of registered addons
 * - Per-addon registration time and uptime
 * - Metadata for each addon
 * 
 * INTERNAL USE:
 * Access via AddonRegistry.getStats().
 */

import { AddonStore } from './AddonStore.js';
import { RegistryStats, AddonInfo } from './types.js';

export class RegistryStatsCollector {
  constructor(private store: AddonStore) {}

  getStats(): RegistryStats {
    const now = Date.now();
    const addons = this.store.getAll();

    return {
      totalAddons: addons.length,
      addons: addons.map(addon => ({
        name: addon.name, // This is now the full namespaced key like "ticketSystem.api"
        registeredAt: addon.registeredAt,
        uptime: now - addon.registeredAt,
        metadata: addon.metadata
      }))
    };
  }

  getAddonInfo(name: string): AddonInfo | null {
    const addon = this.store.get(name);
    if (!addon) return null;

    const now = Date.now();
    return {
      name: addon.name,
      registeredAt: addon.registeredAt,
      uptime: now - addon.registeredAt,
      metadata: addon.metadata
    };
  }

  /**
   * Get aggregated stats for a specific addon namespace
   * Returns info about all exports under that addon
   */
  getAddonNamespaceStats(addonName: string): {
    addonName: string;
    totalExports: number;
    exports: AddonInfo[];
  } | null {
    const allAddons = this.store.getAll();
    const prefix = `${addonName}.`;
    const addonExports = allAddons.filter(addon => addon.name.startsWith(prefix));

    if (addonExports.length === 0) return null;

    const now = Date.now();
    return {
      addonName,
      totalExports: addonExports.length,
      exports: addonExports.map(addon => ({
        name: addon.name,
        registeredAt: addon.registeredAt,
        uptime: now - addon.registeredAt,
        metadata: addon.metadata
      }))
    };
  }

  /**
   * Get summary of all addon namespaces
   */
  getNamespaceSummary(): Array<{
    addonName: string;
    exportCount: number;
    oldestRegistration: number;
  }> {
    const allAddons = this.store.getAll();
    const namespaceMap = new Map<string, { count: number; oldest: number }>();

    allAddons.forEach(addon => {
      const [addonName] = addon.name.split('.');
      if (!addonName) return;

      const current = namespaceMap.get(addonName) || { count: 0, oldest: Date.now() };
      namespaceMap.set(addonName, {
        count: current.count + 1,
        oldest: Math.min(current.oldest, addon.registeredAt)
      });
    });

    return Array.from(namespaceMap.entries()).map(([addonName, data]) => ({
      addonName,
      exportCount: data.count,
      oldestRegistration: data.oldest
    }));
  }
}