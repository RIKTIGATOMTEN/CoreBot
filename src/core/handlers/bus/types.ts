/**
 * EVENT BUS TYPE DEFINITIONS
 * ==========================
 * TypeScript interfaces for the event bus system.
 * 
 * KEY TYPES:
 * - BusEvent: Event object with name, data, timestamp
 * - BusStats: Statistics about bus usage
 * - EventListener: Callback function signature
 */

export interface BusEvent {
  name: string;
  data?: any;
  timestamp: number;
  source?: string;
}

export interface BusStats {
  totalEvents: number;
  listeners: Record<string, number>;
  totalEmissions: number;
}

export type EventListener = (data?: any) => void | Promise<void>;