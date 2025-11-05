import { Client, Channel } from 'discord.js';
import { deleteTicketRecord } from '../utils/database.js';
import { getLangString } from '../utils/config.js';
import { LanguageStrings } from '../types/index.js';
import { logger } from '../utils/logger.js';

export function setupEventHandlers(
  client: Client,
  lang: LanguageStrings
): void {
  client.on('channelDelete', async (channel: Channel) => {
    if (!('id' in channel)) return;

    await deleteTicketRecord(channel.id);
    logger.info(
      getLangString(
        lang,
        'ticketDeletedLog',
        'Ticket channel deleted: {{channelId}}'
      ).replace('{{channelId}}', channel.id)
    );
  });
}
