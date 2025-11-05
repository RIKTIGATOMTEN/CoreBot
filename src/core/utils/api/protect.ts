// src/lib/utils/protect.js
import requestTracker from './requestTracker.js';
import userLimiter from './userLimiter.js';

interface ProtectOptions {
  checkDuplicate?: boolean;
  checkRateLimit?: boolean;
  customLimit?: { max: number; window: number } | null;
  duration?: number;
  data?: string;
}

interface CustomError extends Error {
  code?: string;
  retryAfter?: number;
}

type ProtectedFunction<T> = () => Promise<T>;

/**
 * Protect a function with both request tracking and user rate limiting
 * @param {string} userId - User ID
 * @param {string} action - Action identifier
 * @param {Function} fn - Function to execute
 * @param {Object} [options={}] - Options
 * @returns {Promise<any>}
 */
export async function protect<T>(
  userId: string,
  action: string,
  fn: ProtectedFunction<T>,
  options: ProtectOptions = {}
): Promise<T | null> {
  const {
    checkDuplicate = true,
    checkRateLimit = true,
    customLimit = null,
    duration = 5000,
    data = ''
  } = options;

  // Check 1: Duplicate request
  if (checkDuplicate && requestTracker.isProcessing(userId, action, data)) {
    const error: CustomError = new Error('Request already being processed');
    error.code = 'REQUEST_DUPLICATE';
    throw error;
  }

  // Check 2: Rate limit
  if (checkRateLimit) {
    const rateCheck = userLimiter.check(userId, action, customLimit);
    if (!rateCheck.allowed) {
      const error: CustomError = new Error(`Rate limited. Try again in ${rateCheck.retryAfter} seconds.`);
      error.code = 'RATE_LIMITED';
      error.retryAfter = rateCheck.retryAfter;
      throw error;
    }
  }

  // Execute with tracking
  return await requestTracker.wrap(userId, action, fn, { duration, data, throwOnDuplicate: false });
}

export default protect;