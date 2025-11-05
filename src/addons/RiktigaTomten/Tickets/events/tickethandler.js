import { db } from '#core';
import chalk from "chalk";

const getTimestamp = () => new Date().toLocaleTimeString();

const logger = {
  info: (msg, ...args) => {
    console.log(chalk.white(`✨ [tickethandler] ${getTimestamp()} ${msg}`), ...args);
  },
  error: (msg, ...args) => {
    console.error(chalk.red(`⚠️ [error] ${getTimestamp()} ${msg}`), ...args);
  },
  warn: (msg, ...args) => {
    console.warn(chalk.yellow(`⚠️ [Warn] ${getTimestamp()} ${msg}`), ...args);
  },
  debug: (msg, ...args) => {
    if (process.env.DEBUG === "true") {
      console.log(chalk.cyan(`🛠️ [debug] ${getTimestamp()} ${msg}`), ...args);
    }
  },
};

async function cleanupOrphanedTickets(client) {
  const lang = client.lang["tickethandler.js"] || {};
  const noTickets = lang.NO_TICKETS || " No tickets found in database.";
  const startCleanup = lang.START_CLEANUP || "Starting ticket cleanup...";
  const cleanupComplete = lang.CLEANUP_COMPLETE || "Cleanup complete. Deleted {count} orphaned tickets.";
  const errorText = lang.ERROR || "❌ Error handling tickets:";

  try {
    logger.info(startCleanup);
    const startTime = Date.now();

    // Only fetch open/active tickets, not archived ones
    const [tickets] = await db.execute(
      "SELECT * FROM Tickets WHERE Status IN ('open', 'closed') LIMIT 500"
    );

    if (tickets.length === 0) {
      logger.info(noTickets);
      return;
    }

    logger.debug(`Found ${tickets.length} tickets to check`);

    // Group tickets by guild for efficient checking
    const ticketsByGuild = new Map();
    for (const ticket of tickets) {
      if (!ticketsByGuild.has(ticket.GuildId)) {
        ticketsByGuild.set(ticket.GuildId, []);
      }
      ticketsByGuild.get(ticket.GuildId).push(ticket);
    }

    logger.debug(`Tickets distributed across ${ticketsByGuild.size} guilds`);

    const toDelete = [];

    // Process each guild's tickets
    for (const [guildId, guildTickets] of ticketsByGuild) {
      // Check if bot is still in this guild
      const guild = client.guilds.cache.get(guildId);
      
      if (!guild) {
        logger.warn(`Guild ${guildId} not found - marking all tickets for deletion`);
        toDelete.push(...guildTickets.map(t => t.ChannelId));
        continue;
      }

      // Fetch all channels once for this guild
      let guildChannels;
      try {
        guildChannels = await guild.channels.fetch();
        logger.debug(`Fetched ${guildChannels.size} channels from ${guild.name}`);
      } catch (err) {
        logger.error(`Could not fetch channels from guild ${guild.name}:`, err);
        continue;
      }

      // Check which ticket channels still exist
      for (const ticket of guildTickets) {
        const channelExists = guildChannels.has(ticket.ChannelId);
        
        if (!channelExists) {
          logger.debug(`Channel ${ticket.ChannelId} (Ticket ID: ${ticket.Id}) no longer exists`);
          toDelete.push(ticket.ChannelId);
        } else {
          logger.debug(`Ticket ID ${ticket.Id} is valid`);
        }
      }
    }

    // Batch delete orphaned tickets
    if (toDelete.length > 0) {
      logger.info(`Deleting ${toDelete.length} orphaned tickets...`);
      
      // Delete in batches of 50 to avoid query size limits
      const batchSize = 50;
      let deletedCount = 0;
      
      for (let i = 0; i < toDelete.length; i += batchSize) {
        const batch = toDelete.slice(i, i + batchSize);
        const placeholders = batch.map(() => '?').join(',');
        
        const [result] = await db.execute(
          `DELETE FROM Tickets WHERE ChannelId IN (${placeholders})`,
          batch
        );
        
        deletedCount += result.affectedRows;
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(
        cleanupComplete
          .replace("{count}", deletedCount)
          .replace("{duration}", duration)
      );
    } else {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(`No orphaned tickets found (${duration}s)`);
    }

  } catch (error) {
    logger.error(errorText, error);
  }
}

export default {
  name: "ready",
  once: true,
  async execute(client) {
    // Run cleanup in background - don't block bot startup
    logger.info("🎫 Ticket system initialized - running cleanup in background");
    
    cleanupOrphanedTickets(client).catch(err => {
      logger.error("Cleanup failed:", err);
    });

    // Schedule periodic cleanup every 6 hours
    setInterval(() => {
      logger.debug("⏰ Running scheduled ticket cleanup...");
      cleanupOrphanedTickets(client).catch(err => {
        logger.error("Scheduled cleanup failed:", err);
      });
    }, 6 * 60 * 60 * 1000); // 6 hours
  },
};