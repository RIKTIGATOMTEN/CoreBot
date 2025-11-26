/**
 * PROTECT FUNCTION
 * ================
 * All-in-one protection for user actions.
 * 
 * WHY THIS EXISTS:
 * - Combines duplicate request prevention and rate limiting
 * - Single function for common protection needs
 * - Throws specific error codes for handling
 * 
 * HOW IT WORKS:
 * 1. Check if same request is already processing
 * 2. Check rate limit for user+action
 * 3. Wrap function execution with tracking
 * 4. Throw on duplicate or rate limit
 * 
 * ERROR CODES:
 * - REQUEST_DUPLICATE: Same request already processing
 * - RATE_LIMITED: Too many requests (with retryAfter)
 * 
 * USAGE:
 * import { protect } from '#core';
 * 
 * await protect(userId, 'createTicket', async () => {
 *   await createTicket();
 * });
 */

import requestTracker from '../requestTracker/index.js';
import userLimiter from '../rateLimiter/index.js';
import { ProtectOptions, CustomError } from '../types.js';

type ProtectedFunction<T> = () => Promise<T>;

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

  if (checkDuplicate && requestTracker.isProcessing(userId, action, data)) {
    const error: CustomError = new Error('Request already being processed');
    error.code = 'REQUEST_DUPLICATE';
    throw error;
  }

  if (checkRateLimit) {
    const rateCheck = userLimiter.check(userId, action, customLimit);
    if (!rateCheck.allowed) {
      const error: CustomError = new Error(`Rate limited. Try again in ${rateCheck.retryAfter} seconds.`);
      error.code = 'RATE_LIMITED';
      error.retryAfter = rateCheck.retryAfter;
      throw error;
    }
  }

  return await requestTracker.wrap(userId, action, fn, { duration, data, throwOnDuplicate: false });
}