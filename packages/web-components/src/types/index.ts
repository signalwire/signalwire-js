/**
 * Type definitions for call-media components.
 *
 * Types are imported directly from the SDK to stay in sync.
 */

import type { Call, CallParticipant, CallSelfParticipant, DeviceController, LayoutLayer } from '@signalwire/js';

// Re-export SDK types for internal use
export type { Call, CallParticipant, CallSelfParticipant, DeviceController, LayoutLayer };

// Use SDK's CallParticipant as the canonical Participant type
export type Participant = CallParticipant;

/**
 * Helper to safely get self ID from a Call.
 * Call.self is typed as CallSelfParticipant | null.
 */
export function getSelfId(call: Call | undefined): string | undefined {
  return call?.self?.id;
}

/**
 * Type-safe cast for participants array.
 * The SDK's Call.participants is typed as CallParticipant[], so this
 * provides a semantic helper for web-components that receive unknown[].
 */
export function castParticipants(participants: unknown[]): Participant[] {
  return participants as Participant[];
}
