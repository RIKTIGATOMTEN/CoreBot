/**
 * REGISTRY TYPE DEFINITIONS
 * =========================
 * TypeScript interfaces for the addon registry system.
 * 
 * KEY TYPES:
 * - RegisteredAddon: Stored addon with API and metadata
 * - AddonMetadata: Optional info like version, dependencies
 * - RegistryStats: Statistics about all registered addons
 * - AddonInfo: Public info about a single addon
 */

export interface RegisteredAddon {
  name: string;
  api: any;
  registeredAt: number;
  metadata?: AddonMetadata;
}

export interface AddonMetadata {
  exportName?: string;
  addonName?: string;
  version?: string;
  description?: string;
  dependencies?: string[];
}

export interface RegistryStats {
  totalAddons: number;
  addons: AddonInfo[];
}

export interface AddonInfo {
  name: string;
  registeredAt: number;
  uptime?: number;
  metadata?: AddonMetadata;
}