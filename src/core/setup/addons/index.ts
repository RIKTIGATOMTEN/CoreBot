/**
 * ADDON LOADER MODULE
 * ===================
 * Entry point for discovering and loading addons.
 * 
 * WHY THIS EXISTS:
 * - Orchestrates the addon loading process
 * - Handles both commands and addons
 * - Provides timed loading with error handling
 * - Generates combined loading summary
 * 
 * HOW IT WORKS:
 * 1. Discover modules in addons directory
 * 2. Group by priority (higher priority loads first)
 * 3. Load each module with timeout protection
 * 4. Store results for combined summary
 * 
 * EXPORTS:
 * - loadCommands(): Load command modules only
 * - loadAddonsIfEnabled(): Load addon modules if enabled
 * - logCombinedSummary(): Show loading results
 */

import * as fs from 'fs';
import { Client, Collection } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { isDebug, loadAddons } from '../../config/environment.js';
import { ADDONS_DIR } from '../../utils/paths.js';
import { DiscoveredModule, LoadResult, ModuleType } from './types.js';
import { discoverModules, groupByPriority } from './discovery.js';
import { loadAddon, loadCommand } from './loaders.js';
import { storeCommandResults, storeAddonResults, logCombinedSummary } from './summary.js';

/**
 * Load a module with timing and error handling
 */
async function loadModuleTimed(
  client: Client,
  module: DiscoveredModule,
  loader: (client: Client, module: DiscoveredModule) => Promise<LoadResult>
): Promise<LoadResult> {
  const moduleName = module.creator 
    ? `${module.creator}/${module.info.name || module.dirName}`
    : module.info.name || module.dirName;
  const version = module.info.version || '1.0';
  const startTime = Date.now();

  try {
    logger.debug(`Loading ${module.type}: ${moduleName} v${version}`);

    const loadPromise = loader(client, module);
    const timeoutPromise = new Promise<LoadResult>((_, reject) =>
      setTimeout(() => reject(new Error(`${module.type} loading timeout (30s)`)), 30000)
    );

    const result = await Promise.race([loadPromise, timeoutPromise]);
    const loadTime = Date.now() - startTime;

    if (isDebug && result.success && !result.skipped) {
      logger.debug(`Loaded ${module.type}: ${moduleName} v${version} (${loadTime}ms)`);
    }

    return { ...result, time: loadTime };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    const loadTime = Date.now() - startTime;
    
    if (isDebug) {
      logger.debug(`Error loading ${module.type} ${moduleName}: ${error.message}`);
      logger.debug(`Full error details: ${error.stack}`);
    }

    return {
      name: moduleName,
      success: false,
      time: loadTime,
      interactionCount: 0,
      commandCount: 0,
      error: error.message
    };
  }
}

/**
 * Generic loader for modules of a specific type
 */
async function loadModulesOfType(
  client: Client,
  type: ModuleType,
  loader: (client: Client, module: DiscoveredModule) => Promise<LoadResult>
): Promise<LoadResult[]> {
  const discovered = discoverModules(ADDONS_DIR, type);
  
  if (discovered.length === 0) {
    return [];
  }

  const priorityGroups = groupByPriority(discovered); 
  const allResults: LoadResult[] = [];

  for (const [priority, group] of Array.from(priorityGroups.entries()).sort((a, b) => b[0] - a[0])) {
    const typeLabel = type === 'command' ? 'command' : 'addon';
    
    if (group.length === 1) {
      const label = group[0].creator 
        ? `${group[0].creator}/${group[0].info.name || group[0].dirName}`
        : group[0].info.name || group[0].dirName;
      logger.debug(`Loading priority ${priority} ${typeLabel}: ${label}`);
    } else {
      logger.debug(`Loading ${group.length} ${typeLabel}(s) with priority ${priority} in parallel...`);
    }

    const groupResults = await Promise.allSettled(
      group.map(module => loadModuleTimed(client, module, loader))
    );

    groupResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allResults.push(result.value);
      } else {
        const module = group[index];
        const label = module.creator 
          ? `${module.creator}/${module.info.name || module.dirName}`
          : module.info.name || module.dirName;
        allResults.push({
          name: label,
          success: false,
          time: 0,
          interactionCount: 0,
          commandCount: 0,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });
  }

  return allResults;
}

/**
 * Load all addons
 */
export async function loadAddonsIfEnabled(client: Client): Promise<void> {
  if (!loadAddons) {
    logger.debug('Addon loading is disabled (ADDONS=false)');
    return;
  }

  const startTime = Date.now();
  logger.info('Loading addons...');

  if (!fs.existsSync(ADDONS_DIR)) {
    logger.debug('Addons directory does not exist');
    return;
  }

  const results = await loadModulesOfType(client, 'addon', loadAddon);
  
  if (results.length === 0) {
    logger.info('No valid addons found to load');
    return;
  }

  // Store results for combined summary
  storeAddonResults(results, Date.now() - startTime);
  
  // Show combined summary at the end
  logCombinedSummary();
}

/**
 * Load all commands
 */
export async function loadCommands(client: Client): Promise<boolean> {
  if (!loadAddons) {
    logger.debug('Command loading is disabled (ADDONS=false)');
    return false;
  }
  
  const startTime = Date.now();
  logger.info('Loading commands...');

  if (!fs.existsSync(ADDONS_DIR)) {
    logger.debug('Addons directory does not exist');
    return false;
  }

  if (!client.commands) {
    client.commands = new Collection();
  }

  const results = await loadModulesOfType(client, 'command', loadCommand);
  
  if (results.length === 0) {
    logger.info('No valid commands found to load');
    return false;
  }

  // Store results for combined summary (don't log yet)
  storeCommandResults(results, Date.now() - startTime);
  
  const totalCommands = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + (r.commandCount || 0), 0);
  
  return totalCommands > 0;
}