/**
 * INTERACTION HANDLER
 * ===================
 * Routes Discord interactions to appropriate handlers.
 * 
 * WHY THIS EXISTS:
 * - Discord sends all interactions to one event
 * - Need to route to correct command/button/modal handler
 * - Consistent error handling across interaction types
 * 
 * HOW IT WORKS:
 * - handleInteraction() is called for every interactionCreate
 * - Routes to handleChatInputCommand() for slash commands
 * - Routes to handleComponentInteraction() for buttons/modals/selects
 * - Uses InteractionRegistry to find registered handlers
 * 
 * SUPPORTED TYPES:
 * - Chat input commands (slash commands)
 * - Buttons
 * - Modal submissions
 * - Select menus (all types)
 */

import {
  Interaction,
  Client,
  ChatInputCommandInteraction,
  ButtonInteraction,
  ModalSubmitInteraction,
  AnySelectMenuInteraction,
} from 'discord.js';
import type { Logger } from '../../utils/logger.js';

export async function handleInteraction(
  interaction: Interaction,
  client: Client,
  logger: Logger
): Promise<void> {
  const interactionIdentifier = 'customId' in interaction ? interaction.customId : interaction.type;
  logger.debug('New interaction received with identifier:', interactionIdentifier);

  // Handle chat input commands
  if (interaction.isChatInputCommand()) {
    await handleChatInputCommand(interaction, client, logger);
    return;
  }
  
  // Handle button/modal/select menu interactions through the registry
  if (
    interaction.isButton() || 
    interaction.isModalSubmit() || 
    interaction.isStringSelectMenu() ||
    interaction.isUserSelectMenu() ||
    interaction.isRoleSelectMenu() ||
    interaction.isMentionableSelectMenu() ||
    interaction.isChannelSelectMenu()
  ) {
    await handleComponentInteraction(interaction, client, logger);
    return;
  }
  
  logger.debug(`Unhandled interaction type: ${interaction.type}`);
}

async function handleChatInputCommand(
  interaction: ChatInputCommandInteraction,
  client: Client,
  logger: Logger
): Promise<void> {
  const command = client.commands?.get(interaction.commandName);
  
  if (!command) {
    logger.warn(`Command not found: ${interaction.commandName}`);
    return;
  }
  
  try {
    logger.debug(`Executing command: ${interaction.commandName} for user: ${interaction.user.tag}`);
    await command.execute(interaction, client);
    logger.debug(`Command ${interaction.commandName} executed without issues.`);
  } catch (error) {
    logger.error(`Error when executing command ${interaction.commandName}:`, error);
    const errorMessage = (client as any).lang?.['Main.js']?.COMMAND_ERROR || 'An error occurred when executing the command.';
    await sendErrorResponse(interaction, errorMessage, logger);
  }
}

async function handleComponentInteraction(
  interaction: ButtonInteraction | ModalSubmitInteraction | AnySelectMenuInteraction,
  client: Client,
  logger: Logger
): Promise<void> {
  // Skip if already replied or deferred
  if (interaction.replied || interaction.deferred) {
    logger.debug(`Interaction ${interaction.customId} already replied/deferred`);
    return;
  }

  try {
    // Use the interaction registry to handle the interaction
    if (!client.interactions) {
      logger.warn('Interaction registry not initialized');
      return;
    }

    const handled = await client.interactions.handle(interaction, client);
    
    if (!handled) {
      logger.debug(`No handler registered for ${interaction.customId}`);
    }
  } catch (error) {
    logger.error(`Error handling component interaction ${interaction.customId}:`, error);
    
    // Try to send an error message if we haven't replied yet
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: 'Ett fel inträffade vid bearbetning av interaktionen.',
          flags: 64,
        });
      } catch (replyError) {
        logger.error('Failed to send error reply:', replyError);
      }
    }
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
        flags: 64,
      });
    } else {
      await interaction.reply({
        content: message,
        flags: 64,
      });
    }
  } catch (replyError) {
    logger.error('Failed to send error reply:', replyError);
  }
}