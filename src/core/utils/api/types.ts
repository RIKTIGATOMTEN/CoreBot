/**
 * API UTILITY TYPE DEFINITIONS
 * ============================
 * TypeScript interfaces for rate limiting and request tracking.
 * 
 * KEY TYPES:
 * - RateLimit: Max requests and time window
 * - RateLimitResult: Allowed/blocked with retry info
 * - RateLimitStatus: Current limit status
 * - WrapOptions: Options for request wrapping
 * - ProtectOptions: Options for protect() function
 * - RequestStats/ActiveRequest: Tracking info
 */

export interface RateLimit {
  max: number;
  window: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
  resetAt: number;
}

export interface RateLimitStatus {
  count: number;
  max: number;
  remaining: number;
  resetIn: number;
  resetAt: number;
}

export interface WrapOptions {
  duration?: number;
  data?: string;
  throwOnDuplicate?: boolean;
}

export interface ProtectOptions {
  checkDuplicate?: boolean;
  checkRateLimit?: boolean;
  customLimit?: RateLimit | null;
  duration?: number;
  data?: string;
}

export interface CustomError extends Error {
  code?: string;
  retryAfter?: number;
}

export interface RequestStats {
  active: number;
  requests: string[];
}

export interface ActiveRequest {
  key: string;
  elapsed: number;
}

export interface LimiterStats {
  totalEntries: number;
  activeUsers: number;
  byAction: { [key: string]: number };
}