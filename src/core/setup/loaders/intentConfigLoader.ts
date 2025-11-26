/**
 * INTENT CONFIG LOADER
 * ====================
 * Loads Discord intent configurations from addon intent.js files.
 * 
 * WHY THIS EXISTS:
 * - Addons declare needed intents in intent.js files
 * - Must load before Discord client is created
 * - Allows addons to request privileged intents
 * 
 * HOW IT WORKS:
 * 1. Scan addons for addon.info with intentconfig field
 * 2. Import each intent.js file
 * 3. Register requested intents with intentRegistry
 * 4. Log summary of loaded configurations
 * 
 * INTENT FILE FORMAT:
 * // addons/MyAddon/intent.js
 * import { GatewayIntentBits } from 'discord.js';
 * export const intents = [GatewayIntentBits.MessageContent];
 */

// core/setup/loaders/intentConfigLoader.ts
import path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';
import {logger} from '../../utils/logger.js';
import { parseInfoFile } from '../../utils/fileUtils.js';
import { loadAddons, isDebug } from '../../config/environment.js';
import { ADDONS_DIR } from '../../utils/paths.js';
import { intentRegistry } from '../../config/intents.js';
import { AddonInfo, IntentConfig } from './types.js';

interface DiscoveredIntentConfig {
  addonName: string;
  configPath: string;
  info: AddonInfo;
}

export async function loadIntentConfigurations(): Promise<void> {
  if (!loadAddons) {
    logger.debug('Addon loading is disabled, skipping intent configurations');
    return;
  }

  logger.debug('Discovering intent configurations...');
  const startTime = Date.now();

  if (!fs.existsSync(ADDONS_DIR)) {
    logger.debug('Addons directory does not exist');
    return;
  }

  const configs = discoverIntentConfigs(ADDONS_DIR);
  
  if (configs.length === 0) {
    logger.debug('No intent configurations found');
    return;
  }

  logger.debug(`Found ${configs.length} addon(s) with intent configurations`);

  let successCount = 0;
  let failCount = 0;
  let totalIntents = 0;

  // Load all intent configs in parallel (they're lightweight)
  const results = await Promise.allSettled(
    configs.map(config => loadSingleIntentConfig(config))
  );

  results.forEach((result, index) => {
    const config = configs[index];
    if (result.status === 'fulfilled') {
      successCount++;
      totalIntents += result.value;
    } else {
      failCount++;
      logger.error(
        `Failed to load intent config for ${config.addonName}:`,
        result.reason?.message || String(result.reason)
      );
    }
  });

  const totalTime = Date.now() - startTime;
  
  if (successCount > 0) {
    logger.success(
      `Loaded ${successCount} intent configuration(s) in ${totalTime}ms` +
      (totalIntents > 0 ? ` (${totalIntents} intent(s) requested)` : '')
    );
    
    if (isDebug && totalIntents > 0) {
      configs.forEach(config => {
        logger.debug(`  ✓ ${config.addonName}`);
      });
    }
  }
  
  if (failCount > 0) {
    logger.warn(`⚠️ ${failCount} intent configuration(s) failed to load`);
  }
}

/**
 * Recursively discover all addon directories with intent configurations
 */
function discoverIntentConfigs(addonsRoot: string): DiscoveredIntentConfig[] {
  const discovered: DiscoveredIntentConfig[] = [];

  const entries = fs.readdirSync(addonsRoot, { withFileTypes: true })
    .filter(d => d.isDirectory());

  for (const entry of entries) {
    const entryPath = path.join(addonsRoot, entry.name);
    const infoPath = path.join(entryPath, 'addon.info');

    // Check if this directory has an addon.info
    if (fs.existsSync(infoPath)) {
      const config = processIntentConfig(entry.name, entryPath, infoPath);
      if (config) discovered.push(config);
    } else {
      // Check subdirectories (creator/addon structure)
      const subDirs = fs.readdirSync(entryPath, { withFileTypes: true })
        .filter(d => d.isDirectory());

      for (const subDir of subDirs) {
        const subDirPath = path.join(entryPath, subDir.name);
        const subInfoPath = path.join(subDirPath, 'addon.info');

        if (fs.existsSync(subInfoPath)) {
          const addonName = `${entry.name}/${subDir.name}`;
          const config = processIntentConfig(addonName, subDirPath, subInfoPath);
          if (config) discovered.push(config);
        }
      }
    }
  }

  return discovered;
}

/**
 * Process a single addon directory for intent config
 */
function processIntentConfig(
  addonName: string,
  dirPath: string,
  infoPath: string
): DiscoveredIntentConfig | null {
  const info = parseInfoFile(infoPath) as AddonInfo | null;
  
  if (!info) {
    return null;
  }

  // Skip if addon is disabled
  if (info.enabled === false) {
    return null;
  }

  // Skip if no intent config specified
  if (!info.intentconfig) {
    return null;
  }

  const configPath = path.join(dirPath, info.intentconfig);
  
  if (!fs.existsSync(configPath)) {
    logger.warn(
      `Intent config specified but not found for ${addonName}: ${info.intentconfig}`
    );
    return null;
  }

  return {
    addonName,
    configPath,
    info
  };
}

/**
 * Load and execute a single intent configuration
 * Returns the number of intents registered
 */
async function loadSingleIntentConfig(
  config: DiscoveredIntentConfig
): Promise<number> {
  try {
    const module = await import(pathToFileURL(config.configPath).href);
    
    if (!module.default) {
      throw new Error('Intent config must have a default export');
    }

    const intentConfig: IntentConfig = module.default;

    if (!Array.isArray(intentConfig.intents)) {
      throw new Error('Intent config must export an object with "intents" array');
    }

    // Validate intents
    const validIntents = intentConfig.intents.filter(intent => {
      if (typeof intent !== 'number') {
        logger.warn(
          `Invalid intent type in ${config.addonName}: ${typeof intent}`
        );
        return false;
      }
      return true;
    });

    if (validIntents.length === 0) {
      logger.warn(`No valid intents found in ${config.addonName}`);
      return 0;
    }

    // Register intents
    intentRegistry.requestMany(validIntents, config.addonName);

    logger.debug(
      `Registered ${validIntents.length} intent(s) from ${config.addonName}`
    );

    return validIntents.length;

  } catch (error) {
    throw new Error(
      `Failed to load intent config: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}