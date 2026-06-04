import type { ResourceType } from './common.types';

/**
 * Pure address-related types (no implementation dependencies)
 * Types that reference model implementations are in interfaces.ts
 */

/** Raw address response from the SignalWire Fabric API. */
export interface GetAddressResponse {
  /** Unique address identifier. */
  id: string;
  /** Human-readable display name. */
  display_name: string;
  /** Resource name (used as a URI for dialing). */
  name: string;
  /** URL for an avatar or preview image. */
  preview_url?: string;
  /** URL for a cover image. */
  cover_url?: string;
  /** Underlying resource identifier. */
  resource_id: string;
  /** Type of the underlying resource. */
  type: ResourceType;
  /** Available communication channels for this address. */
  channels: {
    /** Audio-only channel URI. */
    audio?: string;
    /** Messaging channel URI. */
    messaging?: string;
    /** Video channel URI. */
    video?: string;
  };
  /** Whether the address resource is currently locked. */
  locked: boolean;
  /** ISO 8601 timestamp when the address was created. */
  created_at: string;
}
