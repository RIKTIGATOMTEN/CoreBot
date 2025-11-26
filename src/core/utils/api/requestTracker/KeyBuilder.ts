/**
 * REQUEST KEY BUILDER
 * ===================
 * Builds unique keys for request tracking.
 * 
 * KEY FORMAT:
 * Without data: "userId:action"
 * With data: "userId:action:data"
 * 
 * INTERNAL USE:
 * Used by RequestTracker to generate consistent keys.
 */

export class KeyBuilder {
  static build(userId: string, action: string, data?: string): string {
    return data ? `${userId}:${action}:${data}` : `${userId}:${action}`;
  }
}