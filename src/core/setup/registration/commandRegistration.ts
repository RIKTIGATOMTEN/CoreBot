/**
 * COMMAND REGISTRATION
 * ====================
 * Registers slash commands with Discord's API.
 * 
 * WHY THIS EXISTS:
 * - Slash commands must be registered with Discord
 * - Supports both global and guild-specific registration
 * - Can clear existing commands before registering
 * 
 * HOW IT WORKS:
 * 1. Get environment config (TOKEN, CLIENT_ID, etc.)
 * 2. Optionally clear existing commands (CLEAR_COMMANDS=true)
 * 3. Collect command data from client.commands
 * 4. PUT to Discord API (global or guild route)
 * 
 * REGISTRATION MODES:
 * - REGISTRATION_SCOPE=global: Available in all servers
 * - REGISTRATION_SCOPE=guild: Only in GUILD_ID server
 * 
 * CLEARING COMMANDS:
 * Set CLEAR_COMMANDS=true to remove all commands before registering.
 * Useful when renaming/removing commands.
 */

import { REST } from '@discordjs/rest';
import { Client, DiscordAPIError } from 'discord.js';
import { Routes } from 'discord-api-types/v10';
import { logger } from '../../utils/logger.js';
import { isDebug, clearCommands } from '../../config/environment.js';

interface EnvConfig {
  TOKEN: string;
  CLIENT_ID: string;
  GUILD_ID?: string;
  REGISTRATION_SCOPE: 'global' | 'guild';
}

/**
 * Gets environment configuration for command registration
 * Assumes environment variables have already been validated by main
 */
function getEnvironmentConfig(): EnvConfig {
  const { TOKEN, CLIENT_ID, GUILD_ID, REGISTRATION_SCOPE } = process.env;
  const scope = (REGISTRATION_SCOPE?.toLowerCase() || 'global') as 'global' | 'guild';
  
  if (scope === 'guild' && !GUILD_ID) {
    throw new Error('GUILD_ID is required when REGISTRATION_SCOPE is set to "guild"');
  }
  
  return { 
    TOKEN: TOKEN!, 
    CLIENT_ID: CLIENT_ID!,
    GUILD_ID: GUILD_ID,
    REGISTRATION_SCOPE: scope
  };
}

/**
 * Clear all existing commands from Discord (both global and guild)
 */
async function clearExistingCommands(rest: REST, env: EnvConfig): Promise<void> {
  const results = [];
  
  // Always try to clear global commands
  try {
    logger.info('Clearing global commands...');
    await rest.put(Routes.applicationCommands(env.CLIENT_ID), { body: [] });
    logger.success('Successfully cleared global commands');
    results.push('global: cleared');
  } catch (error) {
    if (error instanceof DiscordAPIError) {
      logger.warn(`Could not clear global commands: ${error.message}`);
      results.push('global: failed');
    }
  }
  
  // If guild ID is provided, clear guild commands too
  if (env.GUILD_ID) {
    try {
      logger.info(`Clearing guild commands in guild: ${env.GUILD_ID}...`);
      await rest.put(
        Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID),
        { body: [] }
      );
      logger.success(`Successfully cleared guild commands in guild: ${env.GUILD_ID}`);
      results.push('guild: cleared');
    } catch (error) {
      if (error instanceof DiscordAPIError) {
        logger.warn(`Could not clear guild commands: ${error.message}`);
        results.push('guild: failed');
      }
    }
  } else {
    logger.info('No GUILD_ID provided, skipping guild command clearing');
    results.push('guild: skipped (no GUILD_ID)');
  }
  
  logger.info(`Command clearing summary: ${results.join(', ')}`);
}

/**
 * Register slash commands with Discord API
 */
export async function registerCommands(client: Client): Promise<void> {
  try {
    const env = getEnvironmentConfig();
    
    if (!client.commands || client.commands.size === 0) {
      logger.warn('No commands found to register');
      return;
    }
    
    const rest = new REST({ version: '10' }).setToken(env.TOKEN);
    
    // Clear existing commands if the flag is enabled
    if (clearCommands) {
      logger.info('CLEAR_COMMANDS is enabled - clearing all commands from both global and guild scopes');
      await clearExistingCommands(rest, env);
      logger.info('Waiting 2 seconds before re-registering commands...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    const commandsData = Array.from(client.commands.values()).map(cmd => cmd.data.toJSON());
    
    const isGlobal = env.REGISTRATION_SCOPE === 'global';
    const scope = isGlobal ? 'globally' : `in guild: ${env.GUILD_ID}`;
    
    logger.debug(`Registering ${commandsData.length} commands ${scope}...`);
    
    const route = isGlobal
      ? Routes.applicationCommands(env.CLIENT_ID)
      : Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID!);
    
    await rest.put(route, { body: commandsData });
    
    logger.success(`Successfully registered ${commandsData.length} command(s) ${scope}`);
    
    if (isGlobal) {
      logger.info('Global commands may take up to 1 hour to appear in all servers');
    } else {
      logger.info('Commands are now available as slash commands in your Discord server!');
    }
  } catch (error) {
    logger.error('Failed to register commands with Discord');
    handleRegistrationError(error);
    
    if (isDebug) {
      throw error;
    }
  }
}

/**
 * Provide detailed debug information for command registration errors
 */
function handleRegistrationError(error: unknown): void {
  if (error instanceof DiscordAPIError) {
    logger.error(`Discord API Error: ${error.message} (Code: ${error.code})`);
    
    if (isDebug) {
      logger.debug('Command registration debug info:');
      logger.debug(`Client ID: ${process.env.CLIENT_ID}`);
      logger.debug(`Guild ID: ${process.env.GUILD_ID || 'N/A (global registration)'}`);
      logger.debug(`Registration Scope: ${process.env.REGISTRATION_SCOPE || 'guild (default)'}`);
    }
    
    const errorHints: Partial<Record<number, string>> = {
      50001: 'Bot is missing access to the guild. Make sure the bot is added to your server.',
      50013: "Bot lacks permissions. Ensure it has 'applications.commands' scope.",
      10004: 'Unknown guild. Verify the GUILD_ID is correct.',
      401: 'Invalid bot token. Check your TOKEN in the .env file.',
    };
    
    const hint = errorHints[error.code as number];
    if (hint) {
      logger.error(`💡 ${hint}`);
    }
    
    if (isDebug && error.stack) {
      logger.debug(`Stack trace: ${error.stack}`);
    }
  } else if (error instanceof Error) {
    logger.error(`Error: ${error.message}`);
    if (isDebug && error.stack) {
      logger.debug(`Stack trace: ${error.stack}`);
    }
  } else {
    logger.error(`Unknown error: ${String(error)}`);
  }
}