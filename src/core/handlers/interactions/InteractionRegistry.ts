/**
 * INTERACTION REGISTRY
 * ====================
 * Central registry for button, modal, and select menu handlers.
 * 
 * WHY THIS EXISTS:
 * - Commands need to register button/modal handlers
 * - Supports exact, prefix, and regex matching
 * - Priority system for handler ordering
 * - Prevents duplicate registration conflicts
 * 
 * HOW IT WORKS:
 * - register() adds handler with customId pattern
 * - handle() finds matching handler and executes it
 * - Handlers sorted by priority (higher first)
 * - First matching handler that returns true wins
 * 
 * MATCH TYPES:
 * - 'exact': customId === pattern
 * - 'prefix': customId.startsWith(pattern)
 * - 'regex': new RegExp(pattern).test(customId)
 * 
 * USAGE IN COMMANDS:
 * export default {
 *   data: new SlashCommandBuilder()...,
 *   execute: async (interaction) => { ... },
 *   interactions: [
 *     {
 *       type: 'button',
 *       customId: 'confirm_',
 *       matchType: 'prefix',
 *       handler: async (interaction) => { ... }
 *     }
 *   ]
 * };
 */

import {
  ButtonInteraction,
  ModalSubmitInteraction,
  AnySelectMenuInteraction,
  Client,
} from 'discord.js';
import type { Logger } from '../../utils/logger.js';

export type InteractionHandler<T = any> = (
  interaction: T,
  client: Client,
  logger: Logger
) => Promise<boolean>;

export type InteractionType = 
  | 'button'
  | 'modal'
  | 'stringSelect'
  | 'userSelect'
  | 'roleSelect'
  | 'mentionableSelect'
  | 'channelSelect';

export type InteractionMatchType = 'exact' | 'prefix' | 'regex';

export interface InteractionRegistration {
  type: InteractionType;
  customId: string;
  matchType: InteractionMatchType;
  handler: InteractionHandler;
  priority: number;
  source: string; // Name of the command/addon that registered this
}

export class InteractionRegistry {
  private handlers: Map<InteractionType, InteractionRegistration[]> = new Map();
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    
    // Initialize maps for each interaction type
    const types: InteractionType[] = [
      'button',
      'modal',
      'stringSelect',
      'userSelect',
      'roleSelect',
      'mentionableSelect',
      'channelSelect'
    ];
    
    types.forEach(type => this.handlers.set(type, []));
  }

  /**
   * Check if a handler with exact customId and type already exists
   */
  has(customId: string, type: InteractionType): boolean {
    const typeHandlers = this.handlers.get(type);
    if (!typeHandlers) return false;
    
    return typeHandlers.some(
      h => h.customId === customId && h.matchType === 'exact'
    );
  }

  /**
   * Get a handler with exact customId and type
   */
  get(customId: string, type: InteractionType): InteractionRegistration | undefined {
    const typeHandlers = this.handlers.get(type);
    if (!typeHandlers) return undefined;
    
    return typeHandlers.find(
      h => h.customId === customId && h.matchType === 'exact'
    );
  }

  /**
   * Register an interaction handler
   */
  register(registration: Omit<InteractionRegistration, 'priority' | 'source'> & {
    priority?: number;
    source?: string;
  }): void {
    const fullRegistration: InteractionRegistration = {
      ...registration,
      priority: registration.priority ?? 0,
      source: registration.source ?? 'unknown'
    };

    const typeHandlers = this.handlers.get(registration.type)!;
    typeHandlers.push(fullRegistration);
    
    // Sort by priority (higher first)
    typeHandlers.sort((a, b) => b.priority - a.priority);

    this.logger.debug(
      `Registered ${registration.matchType} ${registration.type} handler: "${registration.customId}" (priority: ${fullRegistration.priority}) from ${fullRegistration.source}`
    );
  }

  /**
   * Register multiple handlers at once
   */
  registerMany(
    registrations: Array<Omit<InteractionRegistration, 'priority' | 'source'> & {
      priority?: number;
      source?: string;
    }>
  ): void {
    registrations.forEach(reg => this.register(reg));
  }

  /**
   * Find and execute the first matching handler for an interaction
   */
  async handle(
    interaction: ButtonInteraction | ModalSubmitInteraction | AnySelectMenuInteraction,
    client: Client
  ): Promise<boolean> {
    const type = this.getInteractionType(interaction);
    if (!type) {
      this.logger.warn(`Unknown interaction type: ${interaction.type}`);
      return false;
    }

    const handlers = this.handlers.get(type)!;
    const { customId } = interaction;

    for (const registration of handlers) {
      if (this.matches(customId, registration.customId, registration.matchType)) {
        this.logger.debug(
          `Matched ${type} interaction "${customId}" with ${registration.matchType} pattern "${registration.customId}" from ${registration.source}`
        );

        try {
          const handled = await registration.handler(interaction, client, this.logger);
          if (handled) {
            this.logger.debug(`Successfully handled by ${registration.source}`);
            return true;
          }
          // If handler returns false, continue to next handler
          this.logger.debug(`Handler from ${registration.source} declined, trying next...`);
        } catch (error) {
          this.logger.error(
            `Error in ${type} handler from ${registration.source}:`,
            error
          );
          // Continue to next handler on error
        }
      }
    }

    this.logger.debug(`No handler found for ${type} interaction: ${customId}`);
    return false;
  }

  /**
   * Check if a customId matches a pattern
   */
  private matches(
    customId: string,
    pattern: string,
    matchType: InteractionMatchType
  ): boolean {
    switch (matchType) {
      case 'exact':
        return customId === pattern;
      case 'prefix':
        return customId.startsWith(pattern);
      case 'regex':
        try {
          const regex = new RegExp(pattern);
          return regex.test(customId);
        } catch (error) {
          this.logger.error(`Invalid regex pattern: ${pattern}`, error);
          return false;
        }
      default:
        return false;
    }
  }

  /**
   * Determine the interaction type
   */
  private getInteractionType(
    interaction: ButtonInteraction | ModalSubmitInteraction | AnySelectMenuInteraction
  ): InteractionType | null {
    if (interaction.isButton()) return 'button';
    if (interaction.isModalSubmit()) return 'modal';
    if (interaction.isStringSelectMenu()) return 'stringSelect';
    if (interaction.isUserSelectMenu()) return 'userSelect';
    if (interaction.isRoleSelectMenu()) return 'roleSelect';
    if (interaction.isMentionableSelectMenu()) return 'mentionableSelect';
    if (interaction.isChannelSelectMenu()) return 'channelSelect';
    return null;
  }

  /**
   * Unregister all handlers from a specific source
   */
  unregisterSource(source: string): void {
    let count = 0;
    this.handlers.forEach((handlers) => {
      const initialLength = handlers.length;
      const filtered = handlers.filter(h => h.source !== source);
      count += initialLength - filtered.length;
      handlers.length = 0;
      handlers.push(...filtered);
    });
    
    if (count > 0) {
      this.logger.debug(`Unregistered ${count} handler(s) from ${source}`);
    }
  }

  /**
   * Get all registered handlers (for debugging)
   */
  getAll(): Map<InteractionType, InteractionRegistration[]> {
    return this.handlers;
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.forEach(handlers => handlers.length = 0);
    this.logger.debug('Cleared all interaction handlers');
  }
}