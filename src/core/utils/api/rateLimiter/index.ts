/**
 * RATE LIMITER MODULE EXPORTS
 * ===========================
 * Entry point for rate limiting utilities.
 * 
 * Default export is a singleton UserLimiter instance.
 */

import { UserLimiter } from './UserLimiter.js';

export { UserLimiter } from './UserLimiter.js';
export { LimitStore } from './LimitStore.js';
export { LimitConfig } from './LimitConfig.js';
export { Cleaner } from './Cleaner.js';

const userLimiter = new UserLimiter();
export default userLimiter;