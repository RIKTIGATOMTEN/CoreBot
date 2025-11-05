import { ButtonInteraction, EmbedBuilder, GuildChannel } from 'discord.js';
import { TicketConfig, LanguageStrings } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { getTicketByChannel, updateTicketStatus } from '../utils/database.js';
import { isEmbedEnabled } from '../utils/embed.js';
import { getClosedActionRow } from '../utils/components.js';
import { sendTicketLogEvent } from '../utils/logging.js';
import {
  formatCustomMessage,
  formatDiscordTimestamp,
} from '../utils/formatting.js';

export async function handleCloseTicket(
    interaction: ButtonInteraction,
    ticketConfig: TicketConfig
): Promise<void> {
  await interaction.deferUpdate();

  const channel = interaction.channel;
  if (!channel) return;

  const ticket = await getTicketByChannel(channel.id);
  if (!ticket) {
    logger.warn('No ticket register was found for the channel with the id', channel.id);
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
        .catch((err: any) => logger.error('Error when changing the channel name:', err));
  }

  await updateTicketStatus(channel.id, 'closed');
  logger.debug('Ticket status set to closed:', channel.id);

  // Remove permissions for creator
  if ('permissionOverwrites' in channel) {
    await channel.permissionOverwrites.edit(ticket.CreatorId, {
      ViewChannel: false,
      SendMessages: false,
    });
  }

  const reasonText = 'No reason given.';

  // Update ticket message
  const channelContent = isEmbedEnabled(optionConfig, ticketConfig)
      ? new EmbedBuilder()
          .setColor((optionConfig.closedembedColor || '#0384e0') as any)
          .setTitle('Ticket Closed!')
          .setDescription(`Reason: ${reasonText}`)
          .setFooter({
            text:
                ticketConfig.embedFooter || 'Server Roleplay - discord.gg/discord',
          })
      : `Ticket Closed! Reason: ${reasonText}`;

  await updateTicketMessage(
      channel,
      ticket,
      channelContent,
      reasonText,
      ticketConfig
  );

  logger.info('Ticket Closed:', channel.id);

  // Send log event
  await sendTicketLogEvent('close', '', interaction.client, ticketConfig, {
    closeuser: `<@${interaction.user.id}>`,
    openuser: `<@${ticket.CreatorId}>`,
    closedatcode: `\`${new Date().toLocaleTimeString()}\``,
    relative: formatDiscordTimestamp('now', 'R'),
    reason: reasonText,
    '#channelid': `<#${channel.id}>`,
  });

  // Send DM if configured
  await sendClosedDM(interaction.client, ticket, optionConfig, reasonText);
}

export async function handleArchiveTicket(
    interaction: ButtonInteraction,
    ticketConfig: TicketConfig
): Promise<void> {
  // Check if interaction has already been replied to
  if (interaction.replied || interaction.deferred) {
    logger.debug('Interaction already replied to, skipping deferReply');
  } else {
    await interaction.deferReply({ flags: 64 });
  }

  const channel = interaction.channel;
  if (!channel) return;

  const ticket = await getTicketByChannel(channel.id);
  if (!ticket) {
    logger.warn('Ticket is missing when archiving for channel:', channel.id);
    if (interaction.deferred) {
      await interaction.editReply({ content: 'Ticket not found.' });
    }
    return;
  }

  const optionConfig = ticketConfig.options.find(
      (opt) => opt.value === ticket.Category
  );
  if (!optionConfig) return;

  const newChannelName = `${ticket.CreatorUsername}-${optionConfig.prefix}`;

  try {
    if (channel instanceof GuildChannel && 'setName' in channel) {
      await channel.setName(newChannelName);
    }

    if (
        ticketConfig.Arkiv?.enabled &&
        ticketConfig.Arkiv.id &&
        'setParent' in channel
    ) {
      await channel.setParent(ticketConfig.Arkiv.id);
    }

    await updateTicketStatus(channel.id, 'archived');
    if (interaction.deferred) {
      await interaction.editReply({ content: 'Ticket has been archived.' });
    }

    logger.info('Ticket archived:', channel.id);

    // Send log event
    await sendTicketLogEvent('arkiv', '', interaction.client, ticketConfig, {
      arkivuser: `<@${interaction.user.id}>`,
      openuser: `<@${ticket.CreatorId}>`,
      arkivcode: `\`${new Date().toLocaleTimeString()}\``,
      relative: formatDiscordTimestamp('now', 'R'),
      '#channelid': `<#${channel.id}>`,
    });
  } catch (error) {
    logger.error('Error when archiving:', error);
    if (interaction.deferred) {
      await interaction.editReply({ content: 'Unable to archive the ticket.' });
    }
  }
}

export async function handleDeleteTicket(
    interaction: ButtonInteraction
): Promise<void> {
  const channel = interaction.channel;
  if (!channel) return;

  try {
    // Check if interaction has already been replied to
    if (interaction.replied || interaction.deferred) {
      logger.debug('Interaction already replied to, skipping reply');
    } else {
      try {
        await interaction.reply({
          content: 'Ticket has been removed.',
          flags: 64,
        });
        logger.info('Ticket removal message sent to channel:', channel.id);
      } catch (replyError) {
        // Type guard to check if replyError has a code property
        if (replyError && typeof replyError === 'object' && 'code' in replyError) {
          // If we get an "Unknown interaction" error, log it but continue with deletion
          if ((replyError as any).code === 10062) {
            logger.debug('Interaction already handled elsewhere, continuing with deletion');
          } else {
            logger.error('Error when responding to the interaction:', replyError);
          }
        } else {
          logger.error('Error when responding to the interaction:', replyError);
        }
      }
    }
  } catch (error) {
    logger.error('Unexpected error in handleDeleteTicket:', error);
  }

  try {
    if ('delete' in channel) {
      try {
        await channel.delete();
        logger.info('Ticket channel deleted:', channel.id);
      } catch (deleteError: any) {
        // Check if the error is because the channel doesn't exist
        if (deleteError.code === 10003) { // Unknown Channel error code
          logger.debug('Channel already deleted or not found:', channel.id);
        } else {
          logger.error('Unable to delete the channel:', deleteError);
        }
      }
    }
  } catch (error) {
    logger.error('Unexpected error in delete ticket handler:', error);
  }
}

async function updateTicketMessage(
    channel: any,
    ticket: any,
    content: any,
    reasonText: string,
    ticketConfig: TicketConfig
): Promise<void> {
  if (!ticket.MessageId) {
    logger.warn('Ticket record is missing MessageId.');
    return;
  }

  try {
    const ticketMsg = await channel.messages.fetch(ticket.MessageId);
    await ticketMsg.edit({
      content: typeof content === 'string' ? content : undefined,
      embeds: typeof content !== 'string' ? [content] : undefined,
      components: [getClosedActionRow(ticketConfig)],
    });
    logger.debug('Ticket message updated with new information.');
  } catch (error) {
    logger.error('Could not fetch or update the ticket message:', error);
  }
}

async function sendClosedDM(
    client: any,
    ticket: any,
    optionConfig: any,
    reasonText: string
): Promise<void> {
  if (!optionConfig.closedDMMessage) {
    logger.debug('DM sending disabled for this ticket.');
    return;
  }

  try {
    const creator = await client.users.fetch(ticket.CreatorId);
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
    logger.debug('DM sent after closing for:', ticket.CreatorId);
  } catch (err) {
    logger.error('Could not send DM:', err);
  }
}