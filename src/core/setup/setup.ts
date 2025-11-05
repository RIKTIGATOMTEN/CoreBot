import {Client, Collection} from 'discord.js';
import {GatewayIntentBits} from 'discord.js';
import { handleInteraction } from '../handlers/interactions/interactions.js';
import logger from '../utils/logger.js';
import {loadCommands} from './loaders/commandLoader.js';
import {loadAddonsIfEnabled} from './loaders/addonLoader.js';
import {registerCommands} from './registration/commandRegistration.js';

declare global {
  var client: Client;
}

// Setup and initialize the Discord bot client
export async function setupBot() {
  logger.info('Setting up Discord bot...');
  
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates,
    ],
  });
  
  client.commands = new Collection();
  logger.debug('Discord client created with required intents');
  
  const commandsLoaded = await loadCommands(client);
  // Event listener for interactions
  client.on('interactionCreate', async interaction => {
    try {
      await handleInteraction(interaction, client, logger);
    } catch (error) {
      logger.error('Error handling interaction:', error);
    }
  });
  
  client.once('clientReady', async () => {
    await handleBotReady(client, commandsLoaded);
  });
  
  return client;
}
// Handle bot ready event
async function handleBotReady(client: Client, commandsLoaded: boolean) {
  const readyMessage = `${client.user?.tag} is now online and ready!`;
  logger.success(readyMessage);
  logger.info(`Connected to Discord as: ${client.user?.tag}`);
  logger.info(`Serving ${client.guilds.cache.size} server(s) with ${client.users.cache.size} users`);
  
  if (commandsLoaded) {
    await registerCommands(client);
  }
  
  const startTime = Date.now();
  
  try {    
    // load addons
    await loadAddonsIfEnabled(client);
  } catch (error) {
    logger.error('Error during initialization:', error);
  }
  
  const duration = Date.now() - startTime;
  logger.debug(`Initialization completed in ${duration}ms`);
  
  globalThis.client = client;
  // Load the damn banner
  const logBanner = (await import('../misc/cmd/banner.js')).default;
  await logBanner();
}
