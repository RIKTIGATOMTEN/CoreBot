/**
 * LOADER TYPE DEFINITIONS
 * =======================
 * TypeScript interfaces for addon/command loaders.
 * 
 * WHY THIS EXISTS:
 * - Extends Discord.js Client with custom properties
 * - Defines Command and Addon interfaces
 * - Documents expected structure for modules
 * 
 * KEY TYPES:
 * - Command: Slash command with data, execute, interactions
 * - Addon: Module with execute function and interactions
 * - AddonInfo: Parsed addon.info file fields
 * - IntentConfig: Exported intents array
 */

// core/setup/loaders/types.ts
import { SlashCommandBuilder, Client, Collection } from 'discord.js';
import { InteractionRegistry, InteractionRegistration } from '../../handlers/interactions/InteractionRegistry.js';

// Extend Client to include commands and interaction registry
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
    interactions: InteractionRegistry;
  }
}

// Command interface with optional interaction handlers
export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: any, client?: Client) => Promise<void>;
  info?: CommandInfo;
  // Optional: register interaction handlers
  interactions?: Array<Omit<InteractionRegistration, 'priority' | 'source'>>;
}

export interface CommandInfo {
  name?: string;
  version?: string;
  commandfile?: string;
  priority?: number;
  enabled?: boolean;
  [key: string]: string | number | boolean | undefined;
}

// Addon interface with optional interaction handlers
export interface Addon {
  execute: (client: Client) => Promise<void>;
  // Optional: register interaction handlers
  interactions?: Array<Omit<InteractionRegistration, 'priority' | 'source'>>;
}

export interface AddonInfo {
  name?: string;
  version?: string;
  addonfile?: string;
  commandfile?: string;
  intentconfig?: string;  // Path to intent configuration file (e.g., "script/utils/intent.js")
  priority?: number;
  critical?: boolean;
  enabled?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export interface IntentConfig {
  intents: number[]; // Array of GatewayIntentBits values
}