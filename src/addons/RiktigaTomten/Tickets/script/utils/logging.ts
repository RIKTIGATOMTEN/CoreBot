import { Client, EmbedBuilder } from 'discord.js';
import { TicketConfig, LogData } from '../types/index.js';
import { applyPlaceholders } from './formatting.js';
import { logger } from './logger.js';

export async function sendTicketLogEvent(
    eventType: string,
    logMessage: string,
    client: Client,
    ticketConfig: TicketConfig,
    data: LogData = {}
): Promise<void> {
  const ticketLoggsConfig = ticketConfig.Ticketloggs;

  if (!ticketLoggsConfig?.enabled || !ticketLoggsConfig.channel) {
    logger.debug('Ticket logging disabled or channel missing');
    return;
  }

  try {
    const logChannel = await client.channels.fetch(ticketLoggsConfig.channel);
    if (!logChannel || !('send' in logChannel)) return;

    let embedDescription = '';
    let embedColor = '#007BFF';

    if (['open', 'close', 'arkiv', 'delete'].includes(eventType)) {
      const configMapping = {
        open: {
          desc: ticketLoggsConfig.opemembedDescription,
          color: ticketLoggsConfig.openembedcolor,
        },
        close: {
          desc: ticketLoggsConfig.closeembedDescription,
          color: ticketLoggsConfig.closeembedcolor,
        },
        arkiv: {
          desc: ticketLoggsConfig.arkivembedDescription,
          color: ticketLoggsConfig.arkivembedcolor,
        },
        delete: {
          desc: ticketLoggsConfig.deleteembedDescription,
          color: ticketLoggsConfig.deleteembedcolor,
        },
      };

      const config = configMapping[eventType as keyof typeof configMapping];
      embedDescription = config.desc || '';
      embedColor = config.color || '#007BFF';
    }

    const fullTemplate =
        (embedDescription ? embedDescription + '\n' : '') + logMessage;
    const finalDescription = applyPlaceholders(fullTemplate, data);

    const embed = new EmbedBuilder()
        .setDescription(finalDescription)
        .setFooter({ text: ticketLoggsConfig.embedFooter || '' })
        .setColor(embedColor as any);

    logger.debug(`Sending ticket log event: ${eventType} with data:`, data);
    await logChannel.send({ embeds: [embed] });
  } catch (err) {
    logger.error('Error sending ticket log:', err);
  }
}