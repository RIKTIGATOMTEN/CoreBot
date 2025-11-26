/**
 * ADDON DISCOVERY
 * ===============
 * Finds and catalogs all addons in the addons directory.
 * 
 * WHY THIS EXISTS:
 * - Automatic discovery means no manual registration
 * - Supports nested folder structures (creator/addon)
 * - Discovers extensions within addons
 * - Validates addon.info files
 * 
 * HOW IT WORKS:
 * - Scans addons/ directory recursively
 * - Looks for addon.info files
 * - Parses info and validates fields
 * - Returns array of DiscoveredModule objects
 * 
 * FOLDER STRUCTURES SUPPORTED:
 * addons/MyAddon/addon.info
 * addons/Creator/MyAddon/addon.info
 * addons/MyAddon/extensions/SubAddon/addon.info
 */

import path from 'path';
import * as fs from 'fs';
import { logger } from '../../utils/logger.js';
import { parseInfoFile } from '../../utils/fileUtils.js';
import { DiscoveredModule, ModuleType, AddonInfo } from './types.js';
import { validateAddonInfo } from './validation.js';

/**
 * Discover all modules (addons/commands) in the addons directory
 */
export function discoverModules(addonsRoot: string, type: ModuleType): DiscoveredModule[] {
  const discovered: DiscoveredModule[] = [];
  const processedPaths = new Set<string>();
  
  const entries = fs.readdirSync(addonsRoot, { withFileTypes: true })
    .filter(d => d.isDirectory());

  for (const entry of entries) {
    const entryPath = path.join(addonsRoot, entry.name);
    const infoPath = path.join(entryPath, 'addon.info');

    if (fs.existsSync(infoPath)) {
      const module = processModuleDirectory(entry.name, entryPath, infoPath, type);
      if (module) {
        discovered.push(module);
        processedPaths.add(module.dirPath);
        // Discover extensions for this module and mark their paths processed
        const extensions = discoverExtensions(module, type);
        for (const ext of extensions) {
          discovered.push(ext);
          processedPaths.add(ext.dirPath);
        }
      }
    } else {
      // Check subdirectories (creator/category folder)
      const subDirs = fs.readdirSync(entryPath, { withFileTypes: true })
        .filter(d => d.isDirectory());

      for (const subDir of subDirs) {
        const subDirPath = path.join(entryPath, subDir.name);
        const subInfoPath = path.join(subDirPath, 'addon.info');

        if (fs.existsSync(subInfoPath)) {
          const module = processModuleDirectory(
            subDir.name, 
            subDirPath, 
            subInfoPath, 
            type, 
            entry.name
          );
          if (module) {
            discovered.push(module);
            processedPaths.add(module.dirPath);
            const extensions = discoverExtensions(module, type);
            for (const ext of extensions) {
              discovered.push(ext);
              processedPaths.add(ext.dirPath);
            }
          }
        }
      }
    }
  }

  // NEW: Also scan for extensions in ALL directories, regardless of parent type
  // This ensures command extensions are found even when loading commands first
  const allExtensions = discoverAllExtensions(addonsRoot, type, processedPaths);
  discovered.push(...allExtensions);

  return discovered;
}

/**
 * NEW: Discover extensions from all possible parent modules
 * This is needed because commands load before addons, so we need to scan
 * all directories for extensions directories, not just discovered modules
 */
function discoverAllExtensions(addonsRoot: string, type: ModuleType, processedPaths?: Set<string>): DiscoveredModule[] {
  const allExtensions: DiscoveredModule[] = [];
  processedPaths = processedPaths ?? new Set<string>(); // Avoid duplicates
  
  const entries = fs.readdirSync(addonsRoot, { withFileTypes: true })
    .filter(d => d.isDirectory());

  for (const entry of entries) {
    const entryPath = path.join(addonsRoot, entry.name);
    
    // Check both root level and subdirectories
    const dirsToCheck: Array<{ path: string; creator: string | undefined }> = [
      { path: entryPath, creator: undefined },
    ];
    
    // Add subdirectories
    try {
      const subDirs = fs.readdirSync(entryPath, { withFileTypes: true })
        .filter(d => d.isDirectory());
      
      for (const subDir of subDirs) {
        dirsToCheck.push({
          path: path.join(entryPath, subDir.name),
          creator: entry.name
        });
      }
    } catch {
      // Ignore errors reading subdirectories
    }
    
    // Check each directory for extensions
    for (const { path: dirPath, creator } of dirsToCheck) {
      const infoPath = path.join(dirPath, 'addon.info');
      
      if (!fs.existsSync(infoPath)) continue;
      
      const info = parseInfoFile(infoPath) as AddonInfo | null;
      if (!info || !info.extensions || typeof info.extensions !== 'string') continue;
      
      const extensionsPath = path.join(dirPath, info.extensions);
      if (!fs.existsSync(extensionsPath)) continue;
      
      // Found an extensions directory - scan it
      const extDirs = fs.readdirSync(extensionsPath, { withFileTypes: true })
        .filter(d => d.isDirectory());
      
      for (const extDir of extDirs) {
        const extDirPath = path.join(extensionsPath, extDir.name);
        
        // Skip if already processed
        if (processedPaths.has(extDirPath)) continue;
        processedPaths.add(extDirPath);
        
        const extInfoPath = path.join(extDirPath, 'addon.info');
        if (!fs.existsSync(extInfoPath)) continue;
        
        const parentDirName = path.basename(dirPath);
        const parentLabel = creator ? `${creator}/${parentDirName}` : parentDirName;
        
        const extModule = processModuleDirectory(
          extDir.name,
          extDirPath,
          extInfoPath,
          type,
          creator,
          parentLabel
        );
        
        if (extModule) {
          extModule.isExtension = true;
          extModule.parentModule = parentLabel;
          allExtensions.push(extModule);
          logger.debug(`✓ Discovered extension: ${extModule.dirName} (parent: ${parentLabel}, type: ${type})`);
        }
      }
    }
  }
  
  return allExtensions;
}

/**
 * NEW: Discover extensions for a parent module
 */
function discoverExtensions(
  parentModule: DiscoveredModule,
  type: ModuleType
): DiscoveredModule[] {
  const extensions: DiscoveredModule[] = [];
  
  // Check if parent has extensions path defined
  if (!parentModule.info.extensions || typeof parentModule.info.extensions !== 'string') {
    return extensions;
  }

  const extensionsPath = path.join(parentModule.dirPath, parentModule.info.extensions);
  
  // Check if extensions directory exists
  if (!fs.existsSync(extensionsPath)) {
    logger.debug(`Extensions directory not found for ${parentModule.dirName}: ${extensionsPath}`);
    return extensions;
  }

  logger.debug(`Scanning extensions directory: ${extensionsPath}`);

  const extDirs = fs.readdirSync(extensionsPath, { withFileTypes: true })
    .filter(d => d.isDirectory());

  logger.debug(`Found ${extDirs.length} potential extension(s) in ${parentModule.dirName}`);

  for (const extDir of extDirs) {
    const extDirPath = path.join(extensionsPath, extDir.name);
    const extInfoPath = path.join(extDirPath, 'addon.info');

    if (!fs.existsSync(extInfoPath)) {
      logger.warn(`Extension ${extDir.name} is missing addon.info file`);
      continue;
    }

    const parentLabel = parentModule.creator 
      ? `${parentModule.creator}/${parentModule.dirName}`
      : parentModule.dirName;

    // Process the extension with the current type (addon or command)
    const extModule = processModuleDirectory(
      extDir.name,
      extDirPath,
      extInfoPath,
      type,
      parentModule.creator,
      parentLabel
    );

    if (extModule) {
      extModule.isExtension = true;
      extModule.parentModule = parentLabel;
      extensions.push(extModule);
      
      logger.debug(`✓ Discovered extension: ${extModule.dirName} (parent: ${parentLabel}, type: ${type})`);
    }
    // Note: Extensions can be skipped if they don't have the appropriate file
    // for the current loading phase (e.g., no addonfile during addon loading)
  }

  return extensions;
}

/**
 * Process a single module directory
 */
function processModuleDirectory(
  dirName: string,
  dirPath: string,
  infoPath: string,
  type: ModuleType,
  creator?: string,
  parentModule?: string  // NEW: Parent module identifier
): DiscoveredModule | null {
  const label = creator ? `${creator}/${dirName}` : dirName;
  
  const info = parseInfoFile(infoPath) as AddonInfo | null;
  if (!info) {
    logger.error(`Failed to parse addon.info for ${label}`);
    return null;
  }

  // VALIDATION: Validate addon.info fields
  const validationErrors = validateAddonInfo(info, infoPath);
  if (validationErrors.length > 0) {
    logger.error(`Invalid addon.info for ${label}:`);
    validationErrors.forEach(err => logger.error(`  - ${err}`));
    return null;
  }

  if (info.enabled === false) {
    return null;
  }

  // Handle deprecated 'type' field
  const originalType = (info as any).type;
  const infoType = originalType ? String(originalType).toLowerCase() : undefined;
  if (infoType && infoType !== type) {
    return null;
  }
  if (infoType) {
    logger.warn(
      `Deprecated field 'type: ${originalType}' in addon.info for ${label}; ` +
      `please remove it. Use 'commandfile' for commands or 'addonfile' for addons.`
    );
  }

  // Determine which file to load
  const legacyMain = (info as any).mainfile;
  let fileCandidate: string | undefined;

  if (type === 'command') {
    if (!info.commandfile) {
      return null;
    }
    fileCandidate = info.commandfile;
  } else {
    if (info.addonfile) {
      fileCandidate = info.addonfile;
    } else if (legacyMain) {
      logger.warn(
        `Deprecated field 'mainfile' used in addon.info for ${label}; please migrate to 'addonfile'.`
      );
      fileCandidate = legacyMain;
    } else {
      return null;
    }
  }

  const filePath = path.join(dirPath, fileCandidate as string);
  if (!fs.existsSync(filePath)) {
    logger.error(`Main file for ${label} not found at ${fileCandidate}`);
    return null;
  }

  const module: DiscoveredModule = {
    dirName,
    dirPath,
    info,
    filePath,
    creator,
    type
  };

  if (parentModule) {
    module.parentModule = parentModule;
    module.isExtension = true;
  }

  return module;
}

/**
 * Group modules by priority
 */
export function groupByPriority<T extends { info: AddonInfo }>(modules: T[]): Map<number, T[]> {
  modules.sort((a, b) => (b.info.priority ?? 0) - (a.info.priority ?? 0));
  
  const groups = new Map<number, T[]>();
  for (const module of modules) {
    const priority = module.info.priority ?? 0;
    if (!groups.has(priority)) {
      groups.set(priority, []);
    }
    groups.get(priority)!.push(module);
  }
  
  return groups;
}