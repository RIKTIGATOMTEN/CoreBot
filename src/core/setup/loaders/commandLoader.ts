import path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';
import { SlashCommandBuilder, Client, Interaction, Collection } from 'discord.js';
import logger from '../../utils/logger.js';
import { parseInfoFile, AddonInfo } from '../../utils/fileUtils.js';
import { isDebug } from '../../config/environment.js';
import { ADDONS_DIR } from '../../utils/paths.js';

interface CommandInfo {
  name?: string;
  version?: string;
  mainfile?: string;
  type?: string;
  [key: string]: string | undefined;
}

interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: Interaction, client?: Client) => Promise<void>;
  info?: CommandInfo;
}

declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
    lang?: Record<string, Record<string, string>>;
  }
}

interface CommandModule {
  default?: Command | Command[];
}

interface LoadResult {
  success: boolean;
  commandCount: number;
}

interface LoadSummary {
  commandsLoaded: boolean;
  totalCommands: number;
}

export async function loadCommands(client: Client): Promise<boolean> {
  const addonsPath = ADDONS_DIR;
  let commandsLoaded = false;
  let totalCommandsFound = 0;

  try {
    const allFiles = scanDirectoryRecursively(addonsPath);
    const { commandsLoaded: structuredLoaded, totalCommands: structuredTotal } = await loadStructuredCommands(
      client,
      allFiles
    );
    const { commandsLoaded: standaloneLoaded, totalCommands: standaloneTotal } = await loadStandaloneCommands(
      client,
      allFiles
    );

    if (structuredLoaded || standaloneLoaded) {
      commandsLoaded = true;
    }
    totalCommandsFound += structuredTotal + standaloneTotal;
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(`Failed to read addons directory ${addonsPath}:`, error.message);
  }

  return commandsLoaded;
}

function scanDirectoryRecursively(dirPath: string, fileList: string[] = []): string[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      scanDirectoryRecursively(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

async function loadStructuredCommands(client: Client, allFiles: string[]): Promise<LoadSummary> {
  const infoFiles = allFiles.filter(file => path.basename(file).toLowerCase() === 'command.info');
  let commandsLoaded = false;
  let totalCommands = 0;

  for (const infoFile of infoFiles) {
    const result = await loadStructuredCommand(client, infoFile);
    if (result.success) {
      commandsLoaded = true;
      totalCommands += result.commandCount;
    }
  }

  return { commandsLoaded, totalCommands };
}

async function loadStructuredCommand(client: Client, infoFile: string): Promise<LoadResult> {
  const dirPath = path.dirname(infoFile);
  const info = parseInfoFile(infoFile);

  if (!info) {
    logger.error(`Could not parse command.info at: ${dirPath}`);
    return { success: false, commandCount: 0 };
  }

  if (!info.mainfile) {
    logger.error(`Command info file "${infoFile}" is missing required field "mainfile"`);
    return { success: false, commandCount: 0 };
  }

  let mainFilePath: string;
  if (info.mainfile.startsWith('./') || info.mainfile.startsWith('../')) {
    mainFilePath = path.resolve(dirPath, info.mainfile);
  } else {
    mainFilePath = path.join(dirPath, info.mainfile);
  }

  if (!fs.existsSync(mainFilePath)) {
    logger.error(`Main file for command "${info.name || 'Unknown'}" not found at: ${mainFilePath}`);
    return { success: false, commandCount: 0 };
  }

  try {
    const imported = await import(pathToFileURL(mainFilePath).href) as CommandModule;
    const command = imported.default;

    if (!command) {
      logger.error(`⛔ Failed to import command from "${mainFilePath}": missing default export`);
      return { success: false, commandCount: 0 };
    }

    const defs = Array.isArray(command) ? command : [command];
    let commandCount = 0;

    for (const cmd of defs) {
      if (cmd?.data && typeof cmd.execute === 'function') {
        if (!(cmd.data instanceof SlashCommandBuilder)) {
          logger.error(`⛔ Command from "${mainFilePath}" does not contain valid SlashCommandBuilder data`);
          continue;
        }
        cmd.info = info;
        client.commands?.set(cmd.data.name, cmd);
        commandCount++;
      } else {
        logger.error(`⛔ Invalid command structure in "${mainFilePath}": missing data or execute function`);
      }
    }

    return { success: commandCount > 0, commandCount };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(`❌ Error loading command from "${mainFilePath}":`, error.message);
    if (isDebug) {
      logger.debug(`Full error details: ${error.stack}`);
    }
    return { success: false, commandCount: 0 };
  }
}

async function loadStandaloneCommands(client: Client, allFiles: string[]): Promise<LoadSummary> {
  const jsFiles = allFiles.filter(file => file.endsWith('.js'));
  const commandInfoDirs = new Set(
    allFiles.filter(file => path.basename(file).toLowerCase() === 'command.info').map(file => path.dirname(file))
  );
  const addonInfoDirs = new Set(
    allFiles.filter(file => path.basename(file).toLowerCase() === 'addon.info').map(file => path.dirname(file))
  );

  const standaloneJsFiles = jsFiles.filter(jsFile => {
    const jsFileDir = path.dirname(jsFile);
    return !commandInfoDirs.has(jsFileDir) && !addonInfoDirs.has(jsFileDir);
  });

  let commandsLoaded = false;
  let totalCommands = 0;

  for (const jsFile of standaloneJsFiles) {
    const result = await loadStandaloneCommand(client, jsFile);
    if (result.success) {
      commandsLoaded = true;
      totalCommands += result.commandCount;
    }
  }

  return { commandsLoaded, totalCommands };
}

async function loadStandaloneCommand(client: Client, jsFile: string): Promise<LoadResult> {
  try {
    const imported = await import(pathToFileURL(jsFile).href) as CommandModule;
    const command = imported.default;

    if (!command) {
      return { success: false, commandCount: 0 };
    }

    const defs = Array.isArray(command) ? command : [command];
    let commandCount = 0;

    for (const cmd of defs) {
      if (cmd?.data && typeof cmd.execute === 'function') {
        if (!(cmd.data instanceof SlashCommandBuilder)) {
          logger.error(`⛔ Command from "${jsFile}" does not contain valid SlashCommandBuilder data`);
          continue;
        }
        client.commands?.set(cmd.data.name, cmd);
        commandCount++;
      }
    }

    return { success: commandCount > 0, commandCount };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(`❌ Error loading command from "${jsFile}":`, error.message);
    if (isDebug) {
      logger.debug(`Full error details: ${error.stack}`);
    }
    return { success: false, commandCount: 0 };
  }
}