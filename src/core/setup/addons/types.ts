/**
 * ADDON SETUP TYPE DEFINITIONS
 * ============================
 * TypeScript interfaces for addon discovery and loading.
 * 
 * KEY TYPES:
 * - ModuleType: 'addon' or 'command'
 * - DiscoveredModule: Info about a found addon/command
 * - LoadResult: Outcome of loading a module
 * - AddonModule/CommandModule: Expected module exports
 * - CombinedLoadResults: Collected results for summary
 */

import { Addon, AddonInfo, Command } from '../loaders/types.js';

export type ModuleType = 'addon' | 'command';

export interface DiscoveredModule {
  dirName: string;
  dirPath: string;
  info: AddonInfo;
  filePath: string;  // Points to the actual file to load (commandfile or addonfile)
  creator?: string;
  type: ModuleType;
  parentModule?: string;
  isExtension?: boolean;
}

export interface LoadResult {
  name: string;
  success: boolean;
  time: number;
  commandCount?: number;
  interactionCount: number;
  error?: string;
  messages?: string[];
  skipped?: boolean;  // Indicates if skipped due to conflict
}

export interface AddonModule {
  default?: Addon;
}

export interface CommandModule {
  default?: Command | Command[];
}

export interface CombinedLoadResults {
  commands: LoadResult[];
  addons: LoadResult[];
  commandTime: number;
  addonTime: number;
}

export { Addon, AddonInfo, Command };