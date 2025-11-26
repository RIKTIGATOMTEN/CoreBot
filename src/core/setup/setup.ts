/**
 * BOT SETUP
 * =========
 * Main setup function that initializes the Discord client.
 * 
 * WHY THIS EXISTS:
 * - Centralizes all bot initialization logic
 * - Loads intents, creates client, registers handlers
 * - Orchestrates the startup sequence
 * 
 * HOW IT WORKS:
 * 1. Load intent configurations from addons
 * 2. Build IntentsBitField from requested intents
 * 3. Create Discord.js Client
 * 4. Lock intent registry (no more changes)
 * 5. Initialize interaction registry
 * 6. Set up event handlers
 * 7. Return client for login
 * 
 * STARTUP SEQUENCE:
 * index.ts -> setupBot() -> client.login() -> handleBotReady()
 * 
 * ON READY:
 * - Loads commands
 * - Registers slash commands with Discord
 * - Loads addons if enabled
 * - Shows startup banner
 */

import {Client, Collection, IntentsBitField} from 'discord.js';
import {logger} from '../utils/logger.js';
import { loadCommands, loadAddonsIfEnabled } from './addons/index.js';
import {loadIntentConfigurations} from './loaders/intentConfigLoader.js';
import {registerCommands} from './registration/commandRegistration.js';
import {handleInteraction} from '../handlers/interactions/interaction.js';
import {InteractionRegistry} from '../handlers/interactions/InteractionRegistry.js';
import {buildIntents, lockIntents} from '../config/intents.js';

declare global {
  var client: Client;
}

export async function setupBot() {
  logger.info('Setting up Discord bot...');

  logger.debug('Loading intent configurations...');
  await loadIntentConfigurations();

  logger.debug('Building intent configuration...');
  const intents = buildIntents();

  logger.debug('Creating Discord client with configured intents...');
  const client = new Client({intents});

  lockIntents();

  client.commands = new Collection();
  logger.debug('Discord client created successfully');

  logger.info('Initializing interaction registry...');
  client.interactions = new InteractionRegistry(logger);

  client.on('interactionCreate', async interaction => {
    try {
      await handleInteraction(interaction, client, logger);
    } catch (error) {
      logger.error('Error handling interaction:', error);
    }
  });

  client.once('clientReady', async () => {
    await handleBotReady(client);
  });

  return client;
}

async function handleBotReady(client: Client) {
  const readyMessage = `${client.user?.tag} is now online and ready!`;
  logger.success(readyMessage);
  logger.info(`Connected to Discord as: ${client.user?.tag}`);
  logger.info(`Serving ${client.guilds.cache.size} server(s) with ${client.users.cache.size} users`);

  // Load commands on-ready so their summary appears together with addons
  // and before the startup banner.
  let commandsLoaded = false;
  try {
    commandsLoaded = await loadCommands(client);
  } catch (err) {
    logger.error('Error loading commands:', err);
  }

  if (commandsLoaded) {
    await registerCommands(client);
  }

  const startTime = Date.now();

  try {
    await loadAddonsIfEnabled(client);
  } catch (error) {
    logger.error('Error loading addons:', error);
  }

  const duration = Date.now() - startTime;
  if (duration > 0) {
    logger.debug(`Addon initialization completed in ${duration}ms`);
  }

  globalThis.client = client;

  const logBanner = (await import('../misc/cmd/banner.js')).default;
  await logBanner();
}
