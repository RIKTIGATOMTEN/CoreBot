/**
 * LOCALE HANDLER
 * ==============
 * Centralized locale management for consistent timestamp and date formatting.
 * 
 * WHY THIS EXISTS:
 * - Different parts of the bot need consistent time formatting
 * - Addons shouldn't rely on system locale (which varies by environment)
 * - Makes timestamps configurable without changing code everywhere
 * 
 * FEATURES:
 * - Configurable via .env (LOCALE and TIMEZONE)
 * - Provides formatted timestamps for loggers
 * - Supports both 12h and 24h formats
 * - Fallback to sensible defaults
 * 
 * USAGE:
 * import { locale } from '#core';
 * 
 * const timestamp = locale.getTimestamp(); // "4:59:58 PM"
 * const date = locale.getDate(); // "2025-11-18"
 * const datetime = locale.getDateTime(); // "2025-11-18 4:59:58 PM"
 */

import dotenv from 'dotenv';
import { ENV_PATH } from './paths.js';
import { ErrorHandler } from '../handlers/errors/main.js';

dotenv.config({ path: ENV_PATH });

export interface LocaleConfig {
  locale: string;
  timezone: string;
  timeFormat: '12h' | '24h';
}

export interface LocaleHandler {
  getTimestamp: () => string;
  getDate: () => string;
  getDateTime: () => string;
  getConfig: () => LocaleConfig;
}

// Raw env values
const rawLocale = process.env.LOCALE || 'en-US';
const rawTimezone = process.env.TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone;
const timeFormat = (process.env.TIME_FORMAT === '24h' ? '24h' : '12h') as '12h' | '24h';

// Validated/fallback values — attempt to validate and fall back to safe defaults
let validatedLocale = 'en-US';
let validatedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

// Validate locale
try {
  // Intl.getCanonicalLocales will throw for invalid locales
  const canonical = Intl.getCanonicalLocales(rawLocale);
  if (Array.isArray(canonical) && canonical.length > 0) {
    validatedLocale = canonical[0];
  }
} catch (err) {
  const e = err instanceof Error ? err : new Error(String(err));
  ErrorHandler.handleError(new Error(`Invalid LOCALE '${rawLocale}': ${e.message}`), 'Locale');
  validatedLocale = 'en-US';
}

// Validate timezone
try {
  // This will throw RangeError for invalid timeZone
  new Intl.DateTimeFormat(validatedLocale, { timeZone: rawTimezone }).format(new Date());
  validatedTimezone = rawTimezone;
} catch (err) {
  const e = err instanceof Error ? err : new Error(String(err));
  ErrorHandler.handleError(new Error(`Invalid TIMEZONE '${rawTimezone}': ${e.message}`), 'Locale');
  validatedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
}

const config: LocaleConfig = {
  locale: validatedLocale,
  timezone: validatedTimezone,
  timeFormat
};

function getTimestamp(): string {
  const now = new Date();

  if (timeFormat === '24h') {
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  try {
    return now.toLocaleTimeString(validatedLocale, {
      timeZone: validatedTimezone,
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    ErrorHandler.handleError(new Error(`Failed to format time: ${e.message}`), 'Locale');
    // Fall back to a safe 24h numeric format
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }
}

function getDate(): string {
  const now = new Date();
  try {
    const parts = new Intl.DateTimeFormat(validatedLocale, {
      timeZone: validatedTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(now);

    const y = parts.find(p => p.type === 'year')?.value ?? '0000';
    const m = parts.find(p => p.type === 'month')?.value ?? '01';
    const d = parts.find(p => p.type === 'day')?.value ?? '01';

    return `${y}-${m}-${d}`;
  } catch (err) {
    const e = err instanceof Error ? err : new Error(String(err));
    ErrorHandler.handleError(new Error(`Failed to format date: ${e.message}`), 'Locale');
    return now.toISOString().slice(0, 10);
  }
}


function getDateTime(): string {
  return `${getDate()} ${getTimestamp()}`;
}

function getConfig(): LocaleConfig {
  return { ...config };
}

export const locale: LocaleHandler = {
  getTimestamp,
  getDate,
  getDateTime,
  getConfig
};

export default locale;