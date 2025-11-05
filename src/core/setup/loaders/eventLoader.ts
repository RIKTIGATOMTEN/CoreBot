import path from 'path';
import * as fs from 'fs';
import {pathToFileURL} from 'url';
import {Client} from 'discord.js';
import logger from '../../utils/logger.js';
import {EVENTS_DIR} from '../../utils/paths.js';
// Load event handlers from the events directory
export async function loadEvents(client: Client) {
  logger.info('Checking for event handlers...');
  const eventsPath = EVENTS_DIR; 
  
  if (!fs.existsSync(eventsPath)) {
    logger.debug('Events directory does not exist');
    return;
  }
  try {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    if (eventFiles.length === 0) {
      return;
    }
    let eventsLoaded = 0;
    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file);
      logger.debug(`Loading event from file: ${file}`);
      try {
        const imported = await import(pathToFileURL(filePath).href);
        const evt = imported.default;
        if (!evt || typeof evt.name !== 'string' || typeof evt.execute !== 'function') {
          logger.error(`Invalid event export in ${file} - must have 'name' and 'execute' properties`);
          continue;
        }
        const listener = (...args: any[]) => evt.execute(...args, client);
        if (evt.once) {
          client.once(evt.name, listener);
          logger.success(`Loaded event (once): ${evt.name}`);
        } else {
          client.on(evt.name, listener);
          logger.success(`Loaded event: ${evt.name}`);
        }
        eventsLoaded++;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.error(`Failed to import event from ${file}:`, error.message);
      }
    }
    // Summary of loaded events
    logger.success(`Successfully loaded ${eventsLoaded} event handler(s)`);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error('Could not read events directory:', error.message);
  }
}
