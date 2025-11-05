-- ============================================
-- Discord Ticket System - Database Schema
-- ============================================

-- Main Tickets Table
-- Stores all ticket information and metadata
CREATE TABLE IF NOT EXISTS Tickets (
    -- Primary Key
    Id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- User Information
    CreatorId VARCHAR(255) NOT NULL,
    CreatorUsername VARCHAR(255) NOT NULL,
    
    -- Ticket Details
    Category VARCHAR(100) NOT NULL,
    ChannelId VARCHAR(255) NOT NULL UNIQUE,
    GuildId VARCHAR(255) NOT NULL,
    MessageId VARCHAR(255) NOT NULL,
    
    -- Status Tracking
    Status ENUM('open', 'closed', 'archived') DEFAULT 'open',
    Reason TEXT NULL,
    
    -- Timestamps
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ClosedAt TIMESTAMP NULL,
    
    -- Performance Indexes
    INDEX idx_creator_category (CreatorId, Category),
    INDEX idx_channel (ChannelId),
    INDEX idx_status (Status)
);