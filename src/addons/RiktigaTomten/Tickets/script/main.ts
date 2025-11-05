import {Client, EmbedBuilder} from 'discord.js';
import {loadConfig, saveConfig} from './utils/config.js';
import {logger} from './utils/logger.js';
import {getTicketSelectMenuRow} from './utils/components.js';
import {isEmbedEnabled} from './utils/embed.js';
import {buildMessageContent} from './utils/formatting.js';
import {setupInteractionHandlers} from './handlers/interactions.js';
import {setupEventHandlers} from './handlers/events.js';

// Cache config to avoid repeated disk reads
let configCache: any = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getCachedConfig() {
  const now = Date.now();
  if (configCache && (now - cacheTimestamp) < CACHE_DURATION) {
    logger.debug('Using cached config');
    return configCache;
  }
  
  configCache = await loadConfig();
  cacheTimestamp = now;
  return configCache;
}

export default {
  name: 'ticket',
  once: true,
  async execute(client: Client) {
    if ((client as any).ticketInitialized) {
      logger.debug('Ticket handling already initialized, skipping');
      return;
    }
    (client as any).ticketInitialized = true;

    logger.info('Tickets ready – checking guild and channel for ticket panel');

    try {
      const perfStart = Date.now();
      const {ticketOptions, lang} = await getCachedConfig();
      const ticketConfig = ticketOptions.Ticket;
      logger.debug(`Config loaded in ${Date.now() - perfStart}ms`);

      const TICKET_GUILD = ticketConfig.Guild;
      const PANEL_CHANNEL = ticketConfig.PanelId;

      let ticketCount = {value: 0};
      let ticketPanelMessage: any;
      const ticketCooldowns = new Map<string, number>();

      // Use cache first - much faster than fetching
      const guildStart = Date.now();
      const guild = client.guilds.cache.get(TICKET_GUILD) || 
                    await client.guilds.fetch(TICKET_GUILD);
      logger.debug(`Guild resolved in ${Date.now() - guildStart}ms`);

      const channelStart = Date.now();
      const channel = guild.channels.cache.get(PANEL_CHANNEL) || 
                      await guild.channels.fetch(PANEL_CHANNEL);
      logger.debug(`Channel resolved in ${Date.now() - channelStart}ms`);

      if (!channel) {
        logger.error('Could not fetch channel');
        return;
      }

      if (!('messages' in channel)) {
        logger.error('Invalid channel type for ticket panel');
        return;
      }

      // Try to fetch stored panel message ID first
      const panelStart = Date.now();
      if (ticketConfig.PanelMessageId) {
        try {
          ticketPanelMessage = await channel.messages.fetch(ticketConfig.PanelMessageId);
          logger.debug(`Found existing panel via stored ID in ${Date.now() - panelStart}ms`);
        } catch (err) {
          logger.warn('Stored panel message not found, will search/create new one');
          ticketConfig.PanelMessageId = null;
        }
      }

      // If no stored ID or fetch failed, search for it
      if (!ticketPanelMessage) {
        const messages = await channel.messages.fetch({limit: 10});
        ticketPanelMessage = messages.find(m => m.author.id === client.user!.id && m.components?.length);
        logger.debug(`Panel search completed in ${Date.now() - panelStart}ms`);
      }

      // Create new panel if none found
      if (!ticketPanelMessage) {
        logger.info('No existing panel, creating new ticket panel');
        const row = getTicketSelectMenuRow(ticketConfig);

        let contentOrEmbed: any;
        if (isEmbedEnabled(undefined, ticketConfig)) {
          const embed = new EmbedBuilder()
            .setColor((ticketConfig.embedColor || '#007BFF') as any)
            .setTitle(ticketConfig.embedTitle || 'Ticket System')
            .setDescription(ticketConfig.embedDescription || 'Select a ticket type below');

          if (ticketConfig.enablefooter && ticketConfig.embedFooter) {
            embed.setFooter({text: ticketConfig.embedFooter});
          }
          if (ticketConfig.enableimage && ticketConfig.embedImage?.trim()) {
            embed.setImage(ticketConfig.embedImage);
          }
          if (ticketConfig.enablefields && Array.isArray(ticketConfig.addfields)) {
            embed.addFields(...ticketConfig.addfields);
          }

          contentOrEmbed = {embeds: [embed]};
        } else {
          contentOrEmbed = {
            content: buildMessageContent(
              ticketConfig.embedTitle || 'Ticket System',
              ticketConfig.embedDescription || 'Select a ticket type below'
            ),
          };
        }

        ticketPanelMessage = await channel.send({
          ...contentOrEmbed,
          components: [row],
        });
        
        // Store the panel message ID for next restart
        ticketConfig.PanelMessageId = ticketPanelMessage.id;
        
        // Save config with new panel ID (if you have a saveConfig function)
        try {
          if (typeof saveConfig === 'function') {
            await saveConfig(ticketOptions);
            logger.debug('Panel message ID saved to config');
          }
        } catch (err) {
          logger.warn('Could not save panel message ID to config:', err);
        }
        
        logger.info('Ticket panel sent with ID:', ticketPanelMessage.id);
      } else {
        logger.info('Using existing ticket panel with ID:', ticketPanelMessage.id);
      }

      if (ticketConfig.Arkiv?.enabled && ticketConfig.Arkiv.id) {
        process.env.ARCHIVE_CATEGORY_ID = ticketConfig.Arkiv.id;
        logger.debug('Archive category ID set in environment variable:', ticketConfig.Arkiv.id);
      }

      if (!(client as any).ticketListenersRegistered) {
        (client as any).ticketListenersRegistered = true;
        logger.debug('Registering ticket interaction listeners');

        setupInteractionHandlers(client, ticketConfig, lang, ticketCount, ticketCooldowns);
        setupEventHandlers(client, lang);
      }

      const totalTime = Date.now() - perfStart;
      logger.info(`Ticket system initialized in ${totalTime}ms`);
      
    } catch (error) {
      logger.error('Error initializing ticket system:', error);
    }
  },
};