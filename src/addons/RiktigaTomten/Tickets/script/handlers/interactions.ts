import {
  Client,
  Interaction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';
import { TicketConfig, LanguageStrings } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { getLangString } from '../utils/config.js';
import { handleSelectMenu } from './selectMenu.js';
import {
  handleCloseTicket,
  handleArchiveTicket,
  handleDeleteTicket,
} from './buttons.js';
import { handleCloseReasonModal } from './modals.js';
// Import protection utilities from #core
import { protect } from '#core';

export function setupInteractionHandlers(
  client: Client,
  ticketConfig: TicketConfig,
  lang: LanguageStrings,
  ticketCount: { value: number },
  ticketCooldowns: Map<string, number>
): void {
  client.on('interactionCreate', async (interaction: Interaction) => {
    if (interaction.isCommand() || interaction.isChatInputCommand()) return;

    const customId =
      'customId' in interaction ? interaction.customId : 'unknown';
    logger.debug('New interaction received:', customId || interaction.type);

    try {
      // Handle string select menu
      if (
        interaction.isStringSelectMenu() &&
        interaction.customId === 'ticket_menu'
      ) {
        // Protect menu selection with rate limiting
        await protect(
          interaction.user.id,
          'ticket:menu:select',
          async () => {
            await handleSelectMenu(
              interaction,
              ticketConfig,
              lang,
              ticketCount,
              ticketCooldowns
            );
          },
          {
            customLimit: { max: 3, window: 5000 }, // 3 selections per 5 seconds
            duration: 3000 // Lock for 3 seconds while processing
          }
        );
        return;
      }

      // Handle button interactions
      if (interaction.isButton()) {
        // Use button customId as action identifier for more granular rate limiting
        const action = `ticket:button:${interaction.customId}`;
        
        try {
          await protect(
            interaction.user.id,
            action,
            async () => {
              switch (interaction.customId) {
                case 'close_ticket':
                  await handleCloseTicket(interaction, ticketConfig);
                  break;
                case 'close_ticket_reason':
                  await showCloseReasonModal(interaction, lang);
                  break;
                case 'archive_ticket':
                case 'archiveTicket':
                  await handleArchiveTicket(interaction, ticketConfig);
                  break;
                case 'delete_ticket':
                  await handleDeleteTicket(interaction);
                  break;
              }
            },
            {
              customLimit: { max: 2, window: 3000 }, // 2 clicks per 3 seconds
              duration: 2000 // Lock for 2 seconds while processing
            }
          );
        } catch (error: any) {
          // Handle protection errors gracefully
          if (error.code === 'REQUEST_DUPLICATE') {
            logger.debug(`Duplicate button press blocked for user ${interaction.user.id}`);
            // Optionally notify user (silently fail or show ephemeral message)
            if (!interaction.replied && !interaction.deferred) {
              await interaction.reply({
                content: getLangString(
                  lang,
                  'requestProcessing',
                  'Please wait, your previous request is still being processed...'
                ),
                flags: 64 // Ephemeral
              }).catch(() => {});
            }
          } else if (error.code === 'RATE_LIMITED') {
            logger.debug(`Rate limit hit for user ${interaction.user.id}: ${error.message}`);
            if (!interaction.replied && !interaction.deferred) {
              await interaction.reply({
                content: getLangString(
                  lang,
                  'rateLimited',
                  `Please slow down! Try again in ${error.retryAfter} seconds.`
                ),
                flags: 64 // Ephemeral
              }).catch(() => {});
            }
          } else {
            throw error; // Re-throw other errors
          }
        }
        return;
      }

      // Handle modal submissions
      if (
        interaction.isModalSubmit() &&
        interaction.customId === 'close_reason_modal'
      ) {
        await protect(
          interaction.user.id,
          'ticket:modal:close_reason',
          async () => {
            await handleCloseReasonModal(interaction, ticketConfig);
          },
          {
            customLimit: { max: 2, window: 5000 }, // 2 submissions per 5 seconds
            duration: 3000
          }
        );
        return;
      }
    } catch (error: any) {
      // Global error handler for protection errors not caught above
      if (error.code === 'REQUEST_DUPLICATE' || error.code === 'RATE_LIMITED') {
        logger.debug(`Protection triggered: ${error.message}`);
        // Already handled above, silent fail
      } else {
        logger.error('Error handling interaction:', error);
      }
    }
  });
}

async function showCloseReasonModal(
  interaction: any,
  lang: LanguageStrings
): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId('close_reason_modal')
    .setTitle(getLangString(lang, 'closeModalTitle', 'Close Ticket'));

  const reasonInput = new TextInputBuilder()
    .setCustomId('reason_input')
    .setLabel(getLangString(lang, 'closeModalLabel', 'Reason for closing'))
    .setStyle(TextInputStyle.Paragraph);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput)
  );

  await interaction.showModal(modal);
  logger.debug('Closing-modal shows for:', interaction.user.username);
}