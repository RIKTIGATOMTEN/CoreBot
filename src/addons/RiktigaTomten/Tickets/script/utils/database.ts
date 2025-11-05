import { db } from '#core';
import { logger } from './logger.js';

export async function getTicketCount(
    userId: string,
    category: string
): Promise<number> {
  try {
    const [result] = await db.execute(
        "SELECT COUNT(*) as count FROM Tickets WHERE CreatorId = ? AND Category = ? AND Status = 'open'",
        [userId, category]
    );
    return (result as any[])[0].count;
  } catch (error) {
    logger.error('Error getting ticket count:', error);
    return 0;
  }
}

export async function createTicketRecord(
    creatorId: string,
    creatorUsername: string,
    category: string,
    channelId: string,
    guildId: string,
    messageId: string
): Promise<void> {
  try {
    await db.execute(
        'INSERT INTO Tickets (CreatorId, CreatorUsername, Category, ChannelId, GuildId, MessageId) VALUES (?, ?, ?, ?, ?, ?)',
        [creatorId, creatorUsername, category, channelId, guildId, messageId]
    );
    logger.debug('Ticket inserted into database for:', creatorUsername);
  } catch (error) {
    logger.error('Error creating ticket record:', error);
    throw error;
  }
}

export async function getTicketByChannel(channelId: string) {
  try {
    const [rows] = await db.execute(
        'SELECT * FROM Tickets WHERE ChannelId = ?',
        [channelId]
    );
    return (rows as any[])[0] || null;
  } catch (error) {
    logger.error('Error getting ticket by channel:', error);
    return null;
  }
}

export async function updateTicketStatus(
    channelId: string,
    status: 'closed' | 'archived',
    reason?: string
): Promise<void> {
  try {
    if (reason) {
      await db.execute(
          'UPDATE Tickets SET Status = ?, Reason = ?, ClosedAt = NOW() WHERE ChannelId = ?',
          [status, reason, channelId]
      );
    } else {
      await db.execute(
          'UPDATE Tickets SET Status = ?, ClosedAt = NOW() WHERE ChannelId = ?',
          [status, channelId]
      );
    }
    logger.debug(`Ticket status updated to ${status} for channel:`, channelId);
  } catch (error) {
    logger.error('Error updating ticket status:', error);
    throw error;
  }
}

export async function deleteTicketRecord(channelId: string): Promise<void> {
  try {
    await db.execute('DELETE FROM Tickets WHERE ChannelId = ?', [channelId]);
    logger.info('Ticket record deleted for channel:', channelId);
  } catch (error) {
    logger.error('Error deleting ticket record:', error);
  }
}