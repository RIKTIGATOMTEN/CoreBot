import { ModalSubmitInteraction, EmbedBuilder, GuildChannel } from 'discord.js';
import { TicketConfig } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { getTicketByChannel, updateTicketStatus } from '../utils/database.js';
import { isEmbedEnabled } from '../utils/embed.js';
import { getClosedActionRow } from '../utils/components.js';
import { sendTicketLogEvent } from '../utils/logging.js';
import {
  formatCustomMessage,
  formatDiscordTimestamp,
} from '../utils/formatting.js';

export async function handleCloseReasonModal(
    interaction: ModalSubmitInteraction,
    ticketConfig: TicketConfig
): Promise<void> {
  const reason = interaction.fields.getTextInputValue('reason_input');
  const channel = interaction.channel;

  if (!channel) {
    logger.warn('No channel found during modal submission.');
    await interaction.reply({ content: 'Channel not found.', flags: 64 });
    return;
  }

  const ticket = await getTicketByChannel(channel.id);
  if (!ticket) {
    logger.warn('Ticket record missing for channel during modal submission.');
    await interaction.reply({ content: 'No ticket record found.', flags: 64 });
    return;
  }

  const optionConfig = ticketConfig.options.find(
      (opt) => opt.value === ticket.Category
  );
  if (!optionConfig) return;

  const newChannelName = `closed-${ticket.CreatorUsername}-${optionConfig.prefix}`;

  if (channel instanceof GuildChannel && 'setName' in channel) {
    await channel
        .setName(newChannelName)
        .catch((err: any) =>
            logger.error('Error when changing channel name during modal submission:', err)
        );
  }

  await updateTicketStatus(channel.id, 'closed', reason);
  logger.debug('Ticket closed with reason, channel updated:', channel.id);

  // Remove permissions for creator
  if ('permissionOverwrites' in channel) {
    await channel.permissionOverwrites.edit(ticket.CreatorId, {
      ViewChannel: false,
      SendMessages: false,
    });
  }

  const channelContent = isEmbedEnabled(optionConfig, ticketConfig)
      ? new EmbedBuilder()
          .setColor((optionConfig.closedembedColor || '#0384e0') as any)
          .setTitle('Ticket Closed!')
          .setDescription(`Reason: ${reason}`)
          .setFooter({
            text:
                ticketConfig.embedFooter || 'Server Roleplay - discord.gg/discord',
          })
      : `Ticket Closed! Reason: ${reason}`;

  // Update ticket message
  if (ticket.MessageId) {
    try {
      const ticketMsg = await channel.messages.fetch(ticket.MessageId);
      await ticketMsg.edit({
        content:
            typeof channelContent === 'string' ? channelContent : undefined,
        embeds:
            typeof channelContent !== 'string' ? [channelContent] : undefined,
        components: [getClosedActionRow(ticketConfig)],
      });
      logger.debug(
          'Ticket message updated with closing reason from modal.'
      );
    } catch (error) {
      logger.error(
          'Could not fetch or update ticket message during modal submission:',
          error
      );
    }
  }

  logger.info('Ticket updated with closing reason in channel:', channel.id);

  // Send log event
  await sendTicketLogEvent('close', '', interaction.client, ticketConfig, {
    closeuser: `<@${interaction.user.id}>`,
    openuser: `<@${ticket.CreatorId}>`,
    closedatcode: `\`${new Date().toLocaleTimeString()}\``,
    relative: formatDiscordTimestamp('now', 'R'),
    reason,
    '#channelid': `<#${channel.id}>`,
  });

  // Send DM if configured
  if (optionConfig.closedDMMessage) {
    try {
      const creator = await interaction.client.users.fetch(ticket.CreatorId);
      const formattedDM = await formatCustomMessage(
          optionConfig.closedDMMessage,
          creator,
          optionConfig,
          ticket
      );

      const dmEmbed = new EmbedBuilder()
          .setColor((optionConfig.closedembedColor || '#0384e0') as any)
          .setTitle(
              optionConfig.closedTitle ||
              'Thank you for contacting support. The ticket has now been closed.'
          )
          .setDescription(formattedDM)
          .setFooter({
            text:
                optionConfig.closedembedFooter ||
                'Server Roleplay - discord.gg/discord',
          });

      await creator.send({ embeds: [dmEmbed] });
      logger.debug(
          'DM sent after closing with reason via modal for:',
          ticket.CreatorId
      );
    } catch (err) {
      logger.error('Could not send DM during modal submission:', err);
    }
  }

  await interaction.reply({
    content: 'You have closed the ticket',
    flags: 64,
  });
}