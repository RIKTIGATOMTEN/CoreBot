import {
  StringSelectMenuInteraction,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  PermissionsBitField,
  StringSelectMenuBuilder,
} from 'discord.js';
import { TicketConfig, LanguageStrings } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { getLangString } from '../utils/config.js';
import { getTicketCount, createTicketRecord } from '../utils/database.js';
import { createTicketContent, isEmbedEnabled } from '../utils/embed.js';
import { getTicketActionRow } from '../utils/components.js';
import { sendTicketLogEvent } from '../utils/logging.js';
import { formatDiscordTimestamp } from '../utils/formatting.js';

// Function to get the ticket select menu row
const getTicketSelectMenuRow = (ticketConfig: TicketConfig) => {
  const menu = new StringSelectMenuBuilder()
      .setCustomId('ticket_menu')
      .setPlaceholder(
          ticketConfig.selectMenuPlaceholder || 'Select a ticket type'
      );

  const options = ticketConfig.options.map(({ label, value, description }) => ({
    label,
    value,
    description,
  }));

  menu.addOptions(options);
  logger.debug('Ticket select menu created with options:', options);
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
};

// Refresh the panel
const refreshPanel = async (
    interaction: StringSelectMenuInteraction,
    ticketConfig: TicketConfig
) => {
  try {
    const row = getTicketSelectMenuRow(ticketConfig);
    const originalMessage = interaction.message;

    logger.debug('Updating ticket panel message with new row:', row);
    await originalMessage.edit({ components: [row] });
    logger.debug('Ticket panel updated');
  } catch (error) {
    logger.error('Error updating ticket panel:', error);
  }
};

export async function handleSelectMenu(
    interaction: StringSelectMenuInteraction,
    ticketConfig: TicketConfig,
    lang: LanguageStrings,
    ticketCount: { value: number },
    ticketCooldowns: Map<string, number>
): Promise<void> {
  if (!interaction.deferred && !interaction.replied) {
    try {
      await interaction.deferReply({ flags: 64 });
      logger.debug('DeferReply performed for select menu interaction');
    } catch (error) {
      logger.error('Error handling interaction:', error);
      return;
    }
  }

  logger.debug('Select menu interaction from:', interaction.user.username);
  const selected = interaction.values[0];
  const optionConfig = ticketConfig.options.find(
      (opt) => opt.value === selected
  );

  if (!optionConfig) {
    logger.error('Invalid option selected by:', interaction.user.username);
    await interaction.editReply({ content: 'Invalid option selected.' });
    return;
  }

  logger.debug('Selected option:', optionConfig);

  // Handle link type
  if (optionConfig.type === 'link') {
    logger.debug("Handling 'link' type option");
    const linkButton = new ButtonBuilder()
        .setLabel(optionConfig.buttonLabel || 'Go to Forum')
        .setStyle(ButtonStyle.Link)
        .setURL(optionConfig.url || 'https://discord.gg/discord');

    await refreshPanel(interaction, ticketConfig);
    await interaction.editReply({
      content:
          optionConfig.replyContent || 'Please visit our forum for applications.',
      components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(linkButton),
      ],
    });
    return;
  }

  // Check max tickets per user
  const count = await getTicketCount(interaction.user.id, selected);
  logger.debug(
      `User ${interaction.user.username} already has ${count} open tickets for category ${selected}`
  );

  if (count >= (optionConfig.MaxTicketsPerUser || 1)) {
    logger.info('Max tickets reached for:', interaction.user.username);
    const customResponses = ticketConfig.customization?.customResponses;
    await refreshPanel(interaction, ticketConfig);
    await interaction.editReply({
      content:
          customResponses?.maxTickets ||
          getLangString(
              lang,
              'maxTicketsReached',
              'You have reached the maximum number of tickets for this category.'
          ),
    });
    return;
  }

  // Check cooldown
  if (ticketCooldowns.has(interaction.user.id)) {
    logger.info('User on cooldown:', interaction.user.username);
    const customResponses = ticketConfig.customization?.customResponses;
    await refreshPanel(interaction, ticketConfig);
    const cooldownMsg =
        customResponses?.ticketCooldown ||
        getLangString(
            lang,
            'ticketCooldownMsg',
            'You have recently created a ticket. Please wait before trying again.'
        );
    await interaction.editReply({ content: cooldownMsg });
    return;
  }

  // VALIDATE EVERYTHING BEFORE MAKING CHANGES
  const categoryId = optionConfig.category;

  if (!categoryId) {
    logger.error('Invalid category ID for:', interaction.user.username);
    const customResponses = ticketConfig.customization?.customResponses;
    await refreshPanel(interaction, ticketConfig);
    await interaction.editReply({
      content:
          customResponses?.categoryIdError ||
          getLangString(lang, 'categoryIdError', 'Error: Invalid category ID in configuration.'),
    });
    return;
  }

  const categoryChannel = interaction.guild?.channels.cache.get(categoryId);
  if (!categoryChannel) {
    logger.error(
        `Category channel not found for ticket: ${interaction.user.username} (Category ID: ${categoryId})`
    );
    const customResponses = ticketConfig.customization?.customResponses;
    await refreshPanel(interaction, ticketConfig);
    await interaction.editReply({
      content:
          customResponses?.categoryIdError ||
          getLangString(lang, 'categoryNotFound', 'Error: Category channel not found. Please contact an administrator.'),
    });
    return;
  }

  // ALL VALIDATIONS PASSED - Now we can set cooldown and increment counter
  ticketCooldowns.set(interaction.user.id, Date.now());
  setTimeout(() => ticketCooldowns.delete(interaction.user.id), 5000);
  logger.debug('Cooldown set for user:', interaction.user.username);

  ticketCount.value++;
  logger.debug('Increasing ticket count to:', ticketCount.value);

  const ticketName = `${interaction.user.username}-${optionConfig.prefix}-${ticketCount.value}`;

  // Set permissions
  const permissionOverwrites = [
    {
      id: interaction.guild!.id,
      deny: [PermissionsBitField.Flags.ViewChannel],
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
      ],
    },
  ];

  if (optionConfig.permissionRole) {
    permissionOverwrites.push({
      id: optionConfig.permissionRole,
      allow: [PermissionsBitField.Flags.ViewChannel],
    });
  }

  // Create ticket channel (wrapped in try-catch in case creation fails)
  let ticketChannel;
  try {
    ticketChannel = await interaction.guild!.channels.create({
      name: ticketName,
      type: 0,
      parent: categoryId,
      permissionOverwrites,
    });
    logger.info('Ticket channel created:', ticketChannel.id);
  } catch (error) {
    logger.error('Failed to create ticket channel:', error);
    // Rollback counter and cooldown since creation failed
    ticketCount.value--;
    ticketCooldowns.delete(interaction.user.id);
    logger.debug('Rolled back counter and cooldown due to channel creation failure');
    
    const customResponses = ticketConfig.customization?.customResponses;
    await refreshPanel(interaction, ticketConfig);
    await interaction.editReply({
      content:
          customResponses?.categoryIdError ||
          getLangString(lang, 'channelCreationError', 'Failed to create ticket channel. Please try again or contact an administrator.'),
    });
    return;
  }

  // Send log event
  await sendTicketLogEvent('open', '', interaction.client, ticketConfig, {
    openuser: `<@${interaction.user.id}>`,
    createdatcode: `\`${new Date().toLocaleTimeString()}\``,
    relative: formatDiscordTimestamp('now', 'R'),
    '#channelid': `<#${ticketChannel.id}>`,
  });

  // Create ticket content
  const ticketContent = createTicketContent(
      optionConfig,
      interaction.user,
      ticketConfig
  );
  const buttonRow = getTicketActionRow(lang);

  // Send confirmation
  const customResponses = ticketConfig.customization?.customResponses;
  const createdResponse = (
      customResponses?.ticketCreated ||
      getLangString(lang, 'ticketCreated', 'Ticket created: {{channelId}}')
  ).replace('{{channelId}}', `<#${ticketChannel.id}>`);

  await interaction.editReply({ content: createdResponse });

  // Send ticket message
  let sentTicketMessage;
  try {
    if (isEmbedEnabled(optionConfig, ticketConfig)) {
      sentTicketMessage = await ticketChannel.send({
        content: `<@${interaction.user.id}>`,
        embeds: [ticketContent as any],
        components: [buttonRow],
      });
    } else {
      sentTicketMessage = await ticketChannel.send({
        content: `<@${interaction.user.id}> ${ticketContent}`,
        components: [buttonRow],
      });
    }
    logger.info('Ticket message sent to channel:', ticketChannel.id);
  } catch (error) {
    logger.error('Failed to send ticket message:', error);
    // Channel was created but message failed - still continue to save record
  }

  // Save to database
  try {
    await createTicketRecord(
        interaction.user.id,
        interaction.user.username,
        selected,
        ticketChannel.id,
        interaction.guild!.id,
        sentTicketMessage?.id || ''
    );
    logger.debug('Ticket record saved to database');
  } catch (error) {
    logger.error('Failed to save ticket record to database:', error);
  }

  // Refresh the panel to clear the selection
  await refreshPanel(interaction, ticketConfig);
}