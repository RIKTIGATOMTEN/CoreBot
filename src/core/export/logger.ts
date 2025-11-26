/**
 * LOGGER EXPORTS
 * ==============
 * Re-exports logger for the #core import alias.
 * 
 * This file exists to provide a clean import path:
 * import { logger } from '#core';
 */

export { default as logger } from '../utils/logger.js';
export type { Logger } from '../utils/logger.js';