/**
 * ADDON STORE
 * ===========
 * Internal storage for registered addons.
 * 
 * WHY THIS EXISTS:
 * - Simple Map wrapper for addon storage
 * - Stores addon API and metadata together
 * - Provides CRUD operations for registry
 * 
 * INTERNAL USE:
 * This class is used by AddonRegistry internally.
 * Addons should use AddonRegistry, not AddonStore.
 */

import { RegisteredAddon, AddonMetadata } from './types.js';

export class AddonStore {
  private addons: Map<string, RegisteredAddon> = new Map();

  add(name: string, api: any, metadata?: AddonMetadata): void {
    this.addons.set(name, {
      name,
      api,
      registeredAt: Date.now(),
      metadata
    });
  }

  get(name: string): RegisteredAddon | undefined {
    return this.addons.get(name);
  }

  has(name: string): boolean {
    return this.addons.has(name);
  }

  remove(name: string): boolean {
    return this.addons.delete(name);
  }

  getAll(): RegisteredAddon[] {
    return Array.from(this.addons.values());
  }

  getAllNames(): string[] {
    return Array.from(this.addons.keys());
  }

  clear(): void {
    this.addons.clear();
  }

  size(): number {
    return this.addons.size;
  }
}