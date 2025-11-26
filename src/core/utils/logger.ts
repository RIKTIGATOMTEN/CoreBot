/**
 * CONSOLE LOGGER
 * ==============
 * Color-coded logging with timestamps for the bot.
 * 
 * WHY THIS EXISTS:
 * - Consistent log formatting across the bot
 * - Color-coded by severity for easy reading
 * - Timestamps for tracking when events occurred
 * - Debug mode can be enabled/disabled via .env
 * 
 * LOG LEVELS:
 * - info: General information (white)
 * - warn: Warnings (yellow)
 * - error: Errors (red)
 * - debug: Debug info (cyan) - only if DEBUG=true
 * - success: Success messages (green)
 * - log: Plain log (white)
 * 
 * USAGE:
 * import { logger } from '#core';
 * 
 * logger.info('Bot started');
 * logger.error('Something went wrong:', error);
 * logger.debug('Detailed info'); // Only shows if DEBUG=true
 */

import chalk from 'chalk';
import {locale} from './locale.js';

const isDebugEnabled = (): boolean => process.env.DEBUG === 'true';

export interface Logger {
  info: (msg: string, ...args: any[]) => void;
  warn: (msg: string, ...args: any[]) => void;
  error: (msg: string, ...args: any[]) => void;
  debug: (msg: string, ...args: any[]) => void;
  success: (msg: string, ...args: any[]) => void;
  log: (msg: string, ...args: any[]) => void;
}

const clogger: Logger = {
  info: (msg: string, ...args: any[]): void => {
    console.log(chalk.white(`${locale.getTimestamp()}:[info] ${msg}`), ...args);
  },
  warn: (msg: string, ...args: any[]): void => {
    console.warn(chalk.yellow(`${locale.getTimestamp()}:[warn] ${msg}`), ...args);
  },
  error: (msg: string, ...args: any[]): void => {
    console.error(chalk.red(`${locale.getTimestamp()}:[error] ${msg}`), ...args);
  },
  debug: (msg: string, ...args: any[]): void => {
    if (isDebugEnabled()) {
      console.log(chalk.cyan(`${locale.getTimestamp()}:[debug] ${msg}`), ...args);
    }
  },
  success: (msg: string, ...args: any[]): void => {
    console.log(chalk.green(`${locale.getTimestamp()}:[success] ${msg}`), ...args);
  },
  log: (msg: string, ...args: any[]): void => {
    console.log(chalk.white(`${locale.getTimestamp()}:[log] ${msg}`), ...args);
  },
};

export {clogger as logger};
export default clogger;
