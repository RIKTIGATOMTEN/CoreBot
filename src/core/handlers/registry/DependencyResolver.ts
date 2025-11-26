/**
 * DEPENDENCY RESOLVER
 * ===================
 * Checks and resolves addon dependencies.
 * 
 * WHY THIS EXISTS:
 * - Addons may depend on other addons
 * - Need to verify dependencies are loaded
 * - Find which addons depend on a given addon
 * 
 * HOW IT WORKS:
 * - checkDependencies(): Verify all deps are loaded
 * - getDependents(): Find addons that depend on given addon
 * 
 * INTERNAL USE:
 * Used by AddonRegistry to validate dependencies.
 */

import { AddonStore } from './AddonStore.js';

export class DependencyResolver {
  constructor(private store: AddonStore) {}

  /**
   * Check if all dependencies for an addon are loaded
   */
  checkDependencies(dependencies: string[]): { 
    satisfied: boolean; 
    missing: string[] 
  } {
    const missing: string[] = [];

    for (const dep of dependencies) {
      if (!this.store.has(dep)) {
        missing.push(dep);
      }
    }

    return {
      satisfied: missing.length === 0,
      missing
    };
  }

  /**
   * Get all addons that depend on a specific addon
   */
  getDependents(addonName: string): string[] {
    const dependents: string[] = [];
    const allAddons = this.store.getAll();

    for (const addon of allAddons) {
      if (addon.metadata?.dependencies?.includes(addonName)) {
        dependents.push(addon.name);
      }
    }

    return dependents;
  }
}