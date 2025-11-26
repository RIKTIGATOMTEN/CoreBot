/**
 * API UTILITY CONSTANTS
 * =====================
 * Default values for rate limiting and request tracking.
 * 
 * DEFAULT_LIMITS:
 * - button:click: 10 per 5 seconds
 * - command:use: 20 per 10 seconds
 * - message:send: 5 per 5 seconds
 * 
 * CLEANUP SETTINGS:
 * - CLEANUP_INTERVAL: Check every 5 minutes
 * - CLEANUP_GRACE_PERIOD: Keep entries 1 minute after expiry
 */

import { RateLimit } from './types.js';

export const DEFAULT_LIMITS: { [key: string]: RateLimit } = {
  'button:click': { max: 10, window: 5000 },
  'command:use': { max: 20, window: 10000 },
  'message:send': { max: 5, window: 5000 },
};

export const DEFAULT_DURATION = 5000;
export const CLEANUP_INTERVAL = 300000; // 5 minutes
export const CLEANUP_GRACE_PERIOD = 60000; // 1 minute