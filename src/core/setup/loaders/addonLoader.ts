import path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';
import { Client } from 'discord.js';
import logger from '../../utils/logger.js';
import { parseInfoFile } from '../../utils/fileUtils.js';
import { loadAddons, isDebug } from '../../config/environment.js';
import { ADDONS_DIR } from '../../utils/paths.js';

interface AddonModule {
  default?: {
    execute?: (client: Client) => Promise<void>;
  };
}

interface AddonInfo {
  name?: string;
  version?: string;
  type?: string;
  mainfile?: string;
  priority?: number;  // Higher = loads first (optional, default: 0)
  critical?: boolean; // If true, must load before bot ready (optional, default: true)
  enabled?: boolean;  // If false, skip loading (optional, default: true)
}

interface LoadResult {
  name: string;
  success: boolean;
  time: number;
  error?: string;
}

interface DiscoveredAddon {
  dirName: string;
  dirPath: string;
  info: AddonInfo;
  filePath: string;
  creator?: string; // Optional creator/category name
}

export async function loadAddonsIfEnabled(client: Client): Promise<void> {
  if (!loadAddons) {
    logger.debug('Addon loading is disabled (ADDONS=false)');
    return;
  }

  const startTime = Date.now();
  logger.info('Loading addons...');
  const addonsRoot = ADDONS_DIR;

  if (!fs.existsSync(addonsRoot)) {
    logger.debug('Addons directory does not exist');
    return;
  }

  // Discover all addons (including nested ones)
  const discoveredAddons = discoverAddons(addonsRoot);

  if (discoveredAddons.length === 0) {
    logger.info('No valid addons found to load');
    return;
  }

  // Sort by priority (higher priority first), default to 0 if not specified
  discoveredAddons.sort((a, b) => {
    const priorityA = a.info.priority ?? 0;
    const priorityB = b.info.priority ?? 0;
    return priorityB - priorityA;
  });

  // Group by priority for parallel loading within each priority level
  const priorityGroups = new Map<number, typeof discoveredAddons>();
  for (const addon of discoveredAddons) {
    const priority = addon.info.priority ?? 0;
    if (!priorityGroups.has(priority)) {
      priorityGroups.set(priority, []);
    }
    priorityGroups.get(priority)!.push(addon);
  }

  // Load each priority group (in order), but parallelize within each group
  const allResults: LoadResult[] = [];
  
  for (const [priority, group] of Array.from(priorityGroups.entries()).sort((a, b) => b[0] - a[0])) {
    if (group.length === 1) {
      const addonLabel = group[0].creator 
        ? `${group[0].creator}/${group[0].info.name || group[0].dirName}`
        : group[0].info.name || group[0].dirName;
      logger.debug(`Loading priority ${priority} addon: ${addonLabel}`);
    } else {
      logger.debug(`Loading ${group.length} addon(s) with priority ${priority} in parallel...`);
    }

    // Load all addons in this priority group in parallel
    const groupPromises = group.map(async (addon) => {
      return await loadSingleAddonTimed(client, addon);
    });

    const groupResults = await Promise.allSettled(groupPromises);
    
    // Collect results
    groupResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        allResults.push(result.value);
      } else {
        // Promise rejected (shouldn't happen since we handle errors inside)
        const addon = group[index];
        const addonLabel = addon.creator 
          ? `${addon.creator}/${addon.info.name || addon.dirName}`
          : addon.info.name || addon.dirName;
        allResults.push({
          name: addonLabel,
          success: false,
          time: 0,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });
  }

  // Summary
  const successful = allResults.filter(r => r.success);
  const failed = allResults.filter(r => !r.success);
  
  const totalTime = Date.now() - startTime;
  
  if (successful.length > 0) {
    logger.success(`Successfully loaded ${successful.length}/${allResults.length} addon(s) in ${totalTime}ms`);
    
    if (isDebug) {
      // Show individual timings in debug mode
      successful.forEach(result => {
        logger.debug(`  ✓ ${result.name}: ${result.time}ms`);
      });
    }
  }
  
  if (failed.length > 0) {
    logger.warn(`⚠️ ${failed.length} addon(s) failed to load:`);
    failed.forEach(result => {
      logger.error(`  ✗ ${result.name}: ${result.error}`);
    });
  }

  if (successful.length === 0) {
    logger.info('No addons were loaded');
  }
}

/**
 * Recursively discover all addons in the addons directory
 * Supports both flat structure and nested creator/addon structure
 */
function discoverAddons(addonsRoot: string): DiscoveredAddon[] {
  const discoveredAddons: DiscoveredAddon[] = [];
  
  const entries = fs.readdirSync(addonsRoot, { withFileTypes: true })
    .filter(d => d.isDirectory());

  for (const entry of entries) {
    const entryPath = path.join(addonsRoot, entry.name);
    const infoPath = path.join(entryPath, 'addon.info');

    // Check if this directory has an addon.info (it's an addon itself)
    if (fs.existsSync(infoPath)) {
      const addon = processAddonDirectory(entry.name, entryPath, infoPath);
      if (addon) {
        discoveredAddons.push(addon);
      }
    } else {
      // No addon.info, check subdirectories (creator/category folder)
      const subDirs = fs.readdirSync(entryPath, { withFileTypes: true })
        .filter(d => d.isDirectory());

      for (const subDir of subDirs) {
        const subDirPath = path.join(entryPath, subDir.name);
        const subInfoPath = path.join(subDirPath, 'addon.info');

        if (fs.existsSync(subInfoPath)) {
          const addon = processAddonDirectory(subDir.name, subDirPath, subInfoPath, entry.name);
          if (addon) {
            discoveredAddons.push(addon);
          }
        } else {
          logger.debug(`Skipping ${entry.name}/${subDir.name}: no addon.info file found`);
        }
      }
      
      if (subDirs.length === 0) {
        logger.debug(`Skipping ${entry.name}: no addon.info file found and no subdirectories`);
      }
    }
  }

  return discoveredAddons;
}

/**
 * Process a single addon directory
 */
function processAddonDirectory(
  dirName: string,
  dirPath: string,
  infoPath: string,
  creator?: string
): DiscoveredAddon | null {
  const info = parseInfoFile(infoPath) as AddonInfo | null;
  if (!info) {
    const label = creator ? `${creator}/${dirName}` : dirName;
    logger.error(`Failed to parse addon.info for ${label}`);
    return null;
  }

  // Check if addon is enabled (default to true if not specified)
  if (info.enabled === false) {
    const label = creator ? `${creator}/${dirName}` : dirName;
    logger.debug(`Skipping ${label}: addon is disabled (enabled: false)`);
    return null;
  }

  if (info.type && info.type.toLowerCase() !== 'addon') {
    const label = creator ? `${creator}/${dirName}` : dirName;
    logger.debug(`Skipping ${label}: type is '${info.type}', not 'addon'`);
    return null;
  }

  if (!info.mainfile) {
    const label = creator ? `${creator}/${dirName}` : dirName;
    logger.error(`Addon "${label}" is missing 'mainfile' field in addon.info`);
    return null;
  }

  const addonFilePath = path.join(dirPath, info.mainfile);
  if (!fs.existsSync(addonFilePath)) {
    const label = creator ? `${creator}/${dirName}` : dirName;
    logger.error(`Main file for addon "${label}" not found at ${info.mainfile}`);
    return null;
  }

  return {
    dirName,
    dirPath,
    info,
    filePath: addonFilePath,
    creator
  };
}

async function loadSingleAddonTimed(
  client: Client,
  addon: DiscoveredAddon
): Promise<LoadResult> {
  const addonName = addon.creator 
    ? `${addon.creator}/${addon.info.name || addon.dirName}`
    : addon.info.name || addon.dirName;
  const addonVersion = addon.info.version || '1.0';
  const startTime = Date.now();

  try {
    logger.debug(`Loading addon: ${addonName} v${addonVersion}`);

    // 30 second timeout per addon
    const loadPromise = loadSingleAddon(client, addon.filePath, addonName);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Addon loading timeout (30s)')), 30000)
    );

    const success = await Promise.race([loadPromise, timeoutPromise]);
    const loadTime = Date.now() - startTime;

    if (success) {
      logger.success(`Loaded addon: ${addonName} v${addonVersion} (${loadTime}ms)`);
      return {
        name: addonName,
        success: true,
        time: loadTime
      };
    } else {
      return {
        name: addonName,
        success: false,
        time: loadTime,
        error: 'Failed to initialize (missing export or execute function)'
      };
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    const loadTime = Date.now() - startTime;
    
    logger.error(`❌ Error loading addon ${addonName}:`, error.message);
    if (isDebug) {
      logger.debug(`Full error details: ${error.stack}`);
    }

    return {
      name: addonName,
      success: false,
      time: loadTime,
      error: error.message
    };
  }
}

async function loadSingleAddon(
  client: Client,
  addonFilePath: string,
  addonName: string
): Promise<boolean> {
  try {
    const addon = await import(pathToFileURL(addonFilePath).href) as AddonModule;
    if (addon.default && typeof addon.default.execute === 'function') {
      await addon.default.execute(client);
      return true;
    } else {
      logger.error(`⛔ Failed to initialize addon ${addonName}: missing default export or execute function`);
      return false;
    }
  } catch (err) {
    throw err; // Re-throw to be caught by loadSingleAddonTimed
  }
}