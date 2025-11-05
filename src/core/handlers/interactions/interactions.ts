import {
  Interaction,
  Client,
  ChatInputCommandInteraction,
  ButtonInteraction,
  ModalSubmitInteraction,
  TextChannel,
} from 'discord.js';
import { Logger } from '../../utils/logger.js';

interface TicketInteractionResult {
  handled: boolean;
  skippedByAddon?: boolean;
  error?: Error;
}

async function handleTicketInteraction(
  interaction: ButtonInteraction | ModalSubmitInteraction,
  logger: Logger
): Promise<TicketInteractionResult> {
  const { customId, channel } = interaction;
  
  if (interaction.replied || interaction.deferred) {
    return { handled: true };
  }
  
  if (
    customId === 'archive_ticket' ||
    customId === 'archiveTicket' ||
    customId === 'close_ticket' ||
    customId === 'delete_ticket' ||
    customId === 'close_ticket_reason' ||
    customId === 'close_reason_modal' ||
    customId === 'ticket_menu'
  ) {
    logger.debug(`Skipping ${customId} interaction as it's handled by the addon`);
    return { handled: true, skippedByAddon: true };
  }
  
  if (!channel || !('permissionOverwrites' in channel)) {
    return { handled: false };
  }
  
  const textChannel = channel as TextChannel;
  
  try {
    switch (customId) {
      case 'closeTicket':
        await interaction.reply({
          content: 'Ticket stängs... Ingen mer kommunikation kommer att vara möjlig.',
          ephemeral: true,
        });
        try {
          await textChannel.permissionOverwrites.edit(interaction.user.id, {
            SendMessages: false,
          });
        } catch (permissionError) {
          // Silently ignore permission errors
        }
        return { handled: true };
      default:
        return { handled: false };
    }
  } catch (error) {
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: 'Ett fel inträffade vid bearbetning av interaktionen.',
          ephemeral: true,
        });
      } catch (replyError) {
        // Silently ignore reply errors
      }
    }
    return {
      handled: true,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

export async function handleInteraction(
  interaction: Interaction,
  client: Client,
  logger: Logger
): Promise<void> {
  const interactionIdentifier = 'customId' in interaction ? interaction.customId : interaction.type;
  logger.debug('Ny interaction mottagen:', interactionIdentifier);

  if (interaction.isChatInputCommand()) {
    await handleChatInputCommand(interaction, client, logger);
    return;
  }
  
  if (interaction.isButton() || interaction.isModalSubmit()) {
    await handleButtonOrModal(interaction, logger);
    return;
  }
  
  if (
    'isStringSelectMenu' in interaction &&
    interaction.isStringSelectMenu() &&
    interaction.customId === 'ticket_menu'
  ) {
    logger.debug(`Skipping ticket_menu interaction as it's handled by the addon`);
    return;
  }
  
  logger.debug(`Unhandled interaction type: ${interaction.type}`);
}

async function handleChatInputCommand(
  interaction: ChatInputCommandInteraction,
  client: Client,
  logger: Logger
): Promise<void> {
  const command = (client as any).commands?.get(interaction.commandName);
  
  if (!command) {
    logger.warn(`Command not found: ${interaction.commandName}`);
    return;
  }
  
  try {
    logger.debug(`Kör kommando: ${interaction.commandName} för användare: ${interaction.user.tag}`);
    await command.execute(interaction, client);
    logger.debug(`Kommando ${interaction.commandName} kördes utan fel.`);
  } catch (error) {
    logger.error(`Fel vid körning av kommando ${interaction.commandName}:`, error);
    const errorMessage = (client as any).lang?.['Main.js']?.COMMAND_ERROR || 'Ett fel uppstod vid körning av kommandot.';
    await sendErrorResponse(interaction, errorMessage, logger);
  }
}

async function handleButtonOrModal(
  interaction: ButtonInteraction | ModalSubmitInteraction,
  logger: Logger
): Promise<void> {
  const result = await handleTicketInteraction(interaction, logger);
  
  if (result.handled) {
    const customId = interaction.customId;
    if (!result.skippedByAddon) {
      logger.debug(`Processed ticket interaction: ${customId}`);
    }
    if (result.error) {
      logger.error(`Error processing ticket interaction ${customId}:`, result.error);
    }
  } else {
    const customId = interaction.customId;
    logger.debug(`Unhandled button/modal interaction: ${customId}`);
  }
}

async function sendErrorResponse(
  interaction: ChatInputCommandInteraction,
  message: string,
  logger: Logger
): Promise<void> {
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: message,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: message,
        ephemeral: true,
      });
    }
  } catch (replyError) {
    logger.error('Failed to send error reply:', replyError);
  }
}