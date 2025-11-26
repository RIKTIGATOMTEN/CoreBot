/**
 * DISCORD INTENT MANAGEMENT
 * =========================
 * Dynamic intent registration system for Discord.js client.
 * 
 * WHY THIS EXISTS:
 * - Discord requires declaring intents upfront when creating client
 * - Different addons need different intents (e.g., MessageContent, GuildMembers)
 * - Allows addons to request only the intents they need
 * - Prevents privileged intent warnings when not needed
 * 
 * HOW IT WORKS:
 * - Addons request intents during initialization via intent.js files
 * - IntentRegistry collects all requests before client creation
 * - buildIntents() creates the final IntentsBitField
 * - Registry is locked after bot initialization (late requests warn)
 * 
 * USAGE IN ADDONS:
 * // In your addon's intent.js:
 * import { GatewayIntentBits } from 'discord.js';
 * export const intents = [GatewayIntentBits.MessageContent];
 * 
 * // Or request programmatically:
 * import { requestIntent } from '#core';
 * requestIntent(GatewayIntentBits.GuildMembers, 'MyAddon');
 */

import {GatewayIntentBits, IntentsBitField} from 'discord.js';
import {logger} from '../utils/logger.js';

/**
 * Intent registry - tracks which addons request which intents
 */
class IntentRegistry {
  private requestedIntents = new Set<GatewayIntentBits>();
  private intentSources = new Map<GatewayIntentBits, Set<string>>();
  private locked = false;

  /**
   * Request an intent from an addon
   */
  request(intent: GatewayIntentBits, source: string = 'unknown'): void {
    if (this.locked) {
      logger.warn(
        `⚠️ Intent ${this.getIntentName(intent)} requested by ${source} after bot initialization. ` +
          'This intent will not be available. Request intents during addon initialization.'
      );
      return;
    }

    this.requestedIntents.add(intent);

    if (!this.intentSources.has(intent)) {
      this.intentSources.set(intent, new Set());
    }
    this.intentSources.get(intent)!.add(source);

    logger.debug(`Intent ${this.getIntentName(intent)} requested by ${source}`);
  }

  /**
   * Request multiple intents at once
   */
  requestMany(intents: GatewayIntentBits[], source: string = 'unknown'): void {
    intents.forEach(intent => this.request(intent, source));
  }

  /**
   * Get all requested intents
   */
  getAll(): GatewayIntentBits[] {
    return Array.from(this.requestedIntents);
  }

  /**
   * Lock the registry (called after bot initialization)
   */
  lock(): void {
    this.locked = true;
  }

  /**
   * Get sources that requested a specific intent
   */
  getSources(intent: GatewayIntentBits): string[] {
    return Array.from(this.intentSources.get(intent) || []);
  }

  /**
   * Get a summary of all requested intents
   */
  getSummary(): Map<string, string[]> {
    const summary = new Map<string, string[]>();

    for (const [intent, sources] of this.intentSources.entries()) {
      summary.set(this.getIntentName(intent), Array.from(sources));
    }

    return summary;
  }

  /**
   * Get human-readable name for an intent
   */
  private getIntentName(intent: GatewayIntentBits): string {
    const intentNames: Record<number, string> = {
      [GatewayIntentBits.Guilds]: 'GUILDS',
      [GatewayIntentBits.GuildMembers]: 'GUILD_MEMBERS',
      [GatewayIntentBits.GuildModeration]: 'GUILD_MODERATION',
      [GatewayIntentBits.GuildEmojisAndStickers]: 'GUILD_EMOJIS_AND_STICKERS',
      [GatewayIntentBits.GuildIntegrations]: 'GUILD_INTEGRATIONS',
      [GatewayIntentBits.GuildWebhooks]: 'GUILD_WEBHOOKS',
      [GatewayIntentBits.GuildInvites]: 'GUILD_INVITES',
      [GatewayIntentBits.GuildVoiceStates]: 'GUILD_VOICE_STATES',
      [GatewayIntentBits.GuildPresences]: 'GUILD_PRESENCES',
      [GatewayIntentBits.GuildMessages]: 'GUILD_MESSAGES',
      [GatewayIntentBits.GuildMessageReactions]: 'GUILD_MESSAGE_REACTIONS',
      [GatewayIntentBits.GuildMessageTyping]: 'GUILD_MESSAGE_TYPING',
      [GatewayIntentBits.DirectMessages]: 'DIRECT_MESSAGES',
      [GatewayIntentBits.DirectMessageReactions]: 'DIRECT_MESSAGE_REACTIONS',
      [GatewayIntentBits.DirectMessageTyping]: 'DIRECT_MESSAGE_TYPING',
      [GatewayIntentBits.MessageContent]: 'MESSAGE_CONTENT',
      [GatewayIntentBits.GuildScheduledEvents]: 'GUILD_SCHEDULED_EVENTS',
      [GatewayIntentBits.AutoModerationConfiguration]: 'AUTO_MODERATION_CONFIGURATION',
      [GatewayIntentBits.AutoModerationExecution]: 'AUTO_MODERATION_EXECUTION',
    };

    return intentNames[intent] || `UNKNOWN(${intent})`;
  }

  /**
   * Clear all registrations (for testing)
   */
  clear(): void {
    this.requestedIntents.clear();
    this.intentSources.clear();
    this.locked = false;
  }
}

export const intentRegistry = new IntentRegistry();

/**
 * Default intents that are always enabled
 */
const DEFAULT_INTENTS = [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent];

/**
 * Build the final IntentsBitField from defaults + requested intents
 */
export function buildIntents(): IntentsBitField {
  const allIntents = new Set([...DEFAULT_INTENTS, ...intentRegistry.getAll()]);

  const intentsArray = Array.from(allIntents);

  logger.debug(`Building intents with ${intentsArray.length} total intent(s)`);

  if (process.env.DEBUG === 'true') {
    const summary = intentRegistry.getSummary();
    if (summary.size > 0) {
      logger.debug('Intent requests by addon:');
      for (const [intent, sources] of summary.entries()) {
        logger.debug(`  ${intent}: ${sources.join(', ')}`);
      }
    }
  }

  return new IntentsBitField(intentsArray);
}

/**
 * Lock the intent registry (call after bot setup)
 */
export function lockIntents(): void {
  intentRegistry.lock();
  logger.debug('Intent registry locked - no more intents can be requested');
}

/**
 * Request an intent from an addon
 * Usage: requestIntent(GatewayIntentBits.GuildMembers, 'MyAddon');
 */
export function requestIntent(intent: GatewayIntentBits, source?: string): void {
  const callerSource = source || getCallerSource();
  intentRegistry.request(intent, callerSource);
}

/**
 * Request multiple intents at once
 * Usage: requestIntents([GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildVoiceStates], 'MyAddon');
 */
export function requestIntents(intents: GatewayIntentBits[], source?: string): void {
  const callerSource = source || getCallerSource();
  intentRegistry.requestMany(intents, callerSource);
}

/**
 * Helper to get the caller's source from stack trace
 */
function getCallerSource(): string {
  const stack = new Error().stack;
  if (!stack) return 'unknown';

  const lines = stack.split('\n');

  for (let i = 3; i < lines.length; i++) {
    const match = lines[i].match(/addons[\/\\]([^\/\\]+)[\/\\]([^\/\\]+)/);
    if (match) {
      return match[2] === 'main.js' || match[2] === 'index.js' ? match[1] : `${match[1]}/${match[2]}`;
    }
  }

  return 'unknown';
}

/**
 * Check if an intent is currently available
 * Usage: if (hasIntent(client, GatewayIntentBits.GuildMembers)) { ... }
 */
export function hasIntent(client: any, intent: GatewayIntentBits): boolean {
  return client.options?.intents?.has(intent) ?? false;
}

export {GatewayIntentBits} from 'discord.js';
