/**
 * ADDON LOADERS
 * =============
 * Functions to load addon and command modules.
 * 
 * WHY THIS EXISTS:
 * - Imports and executes addon/command modules
 * - Registers interaction handlers
 * - Detects and prevents conflicts
 * - Returns loading results for summary
 * 
 * HOW IT WORKS:
 * - loadAddon(): Import and execute addon's execute()
 * - loadCommand(): Import and register slash commands
 * - Both check for interaction handler conflicts
 * - Return LoadResult with success/error info
 * 
 * CONFLICT DETECTION:
 * - Checks if command name already registered
 * - Checks if interaction customId already registered
 * - Logs warning and skips on conflict
 */

import { pathToFileURL } from 'url';
import { Client, SlashCommandBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { DiscoveredModule, LoadResult, AddonModule, CommandModule } from './types.js';

/**
 * Load an addon module
 */
export async function loadAddon(client: Client, module: DiscoveredModule): Promise<LoadResult> {
  const moduleName = module.creator 
    ? `${module.creator}/${module.info.name || module.dirName}`
    : module.info.name || module.dirName;
  
  // Extension indicator to name for clarity
  const displayName = module.isExtension 
    ? `${module.parentModule}/${moduleName}` 
    : moduleName;
  
  const addon = await import(pathToFileURL(module.filePath).href) as AddonModule;
  
  if (!addon.default || typeof addon.default.execute !== 'function') {
    throw new Error('Missing default export or execute function');
  }

  await addon.default.execute(client);
  
  let interactionCount = 0;
  if (addon.default.interactions && Array.isArray(addon.default.interactions) && client.interactions) {
    const handlersToRegister = addon.default.interactions.map(handler => ({
      ...handler,
      priority: module.info.priority ?? 0,
      source: displayName
    }));
    
    // SAFETY: Check for interaction conflicts before registering
    for (const handler of handlersToRegister) {
      const existing = client.interactions.get(handler.customId, handler.type);
      if (existing) {
        throw new Error(
          `Interaction conflict: ${handler.type}:${handler.customId} already registered by ${existing.source}`
        );
      }
    }
    
    client.interactions.registerMany(handlersToRegister);
    interactionCount = addon.default.interactions.length;
  }

  return {
    name: moduleName,
    success: true,
    time: 0,
    interactionCount
  };
}

/**
 * Load a command module
 */
export async function loadCommand(client: Client, module: DiscoveredModule): Promise<LoadResult> {
  const moduleName = module.creator 
    ? `${module.creator}/${module.info.name || module.dirName}`
    : module.info.name || module.dirName;

    const displayName = module.isExtension 
    ? `${module.parentModule}/${moduleName}` 
    : moduleName;

  const imported = await import(pathToFileURL(module.filePath).href) as CommandModule;
  const commandData = imported.default;

  if (!commandData) {
    throw new Error('Missing default export');
  }

  const defs = Array.isArray(commandData) ? commandData : [commandData];
  let commandCount = 0;
  let interactionCount = 0;
  const messages: string[] = [];
  const skippedCommands: string[] = [];

  for (const cmd of defs) {
    if (cmd?.data && typeof cmd.execute === 'function') {
      if (!(cmd.data instanceof SlashCommandBuilder)) {
        messages.push('Command does not contain valid SlashCommandBuilder data');
        continue;
      }

      // SAFETY: Check for command name conflicts
      if (client.commands.has(cmd.data.name)) {
        const existing = client.commands.get(cmd.data.name);
        const existingSource = existing?.info?.name || 'unknown';
        skippedCommands.push(cmd.data.name);
        logger.warn(
          `⚠️ Command conflict: "${cmd.data.name}" already registered by ${existingSource}. ` +
          `Skipping duplicate from ${moduleName}`
        );
        continue;
      }

      cmd.info = module.info;
      client.commands.set(cmd.data.name, cmd);
      commandCount++;

      if (cmd.interactions && Array.isArray(cmd.interactions) && client.interactions) {
        const priority = module.info.priority ?? 0;
        const handlersToRegister = cmd.interactions.map(handler => ({
          ...handler,
          priority,
          source: displayName
        }));

        // SAFETY: Check for interaction conflicts before registering
        for (const handler of handlersToRegister) {
          const existing = client.interactions.get(handler.customId, handler.type);
          if (existing) {
            throw new Error(
              `Interaction conflict: ${handler.type}:${handler.customId} already registered by ${existing.source}`
            );
          }
        }

        client.interactions.registerMany(handlersToRegister);
        interactionCount += cmd.interactions.length;
      }
    } else {
      messages.push('Invalid command structure: missing data or execute function');
    }
  }

  // If ALL commands were skipped due to conflicts, mark as skipped
  if (commandCount === 0 && skippedCommands.length > 0) {
    return {
      name: moduleName,
      success: false,
      time: 0,
      interactionCount: 0,
      commandCount: 0,
      skipped: true,
      error: `All commands skipped due to conflicts: ${skippedCommands.join(', ')}`
    };
  }

  if (commandCount === 0) {
    throw new Error(messages.length ? `No valid commands found in module: ${messages.join('; ')}` : 'No valid commands found in module');
  }

  const result: LoadResult = {
    name: displayName,
    success: true,
    time: 0,
    commandCount,
    interactionCount
  };

  if (messages.length > 0) result.messages = messages;
  if (skippedCommands.length > 0) {
    result.messages = result.messages || [];
    result.messages.push(`Skipped duplicate commands: ${skippedCommands.join(', ')}`);
  }

  return result;
}