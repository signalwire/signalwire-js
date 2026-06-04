/**
 * AudioConstraintMerger - Merges audio/video constraints from multiple sources.
 *
 * When switching microphones mid-call, the current audio processing flags
 * (echo cancellation, noise suppression, auto gain) must carry over to the
 * new device. This module handles the three-layer merge:
 *
 *   1. Server-side participant state (highest priority)
 *   2. User-set preferences / device constraints
 *   3. SDK defaults (lowest priority)
 *
 * @see Section 16.3 of the Implementation Guide
 */

import { DEFAULT_AUDIO_CONSTRAINTS, DEFAULT_VIDEO_CONSTRAINTS } from '../core/constants';

/**
 * Server-side participant audio processing state.
 *
 * These values come from the participant's observable state
 * (echoCancellation$, noiseSuppression$, autoGain$).
 * When defined, they take highest merge priority.
 */
export interface ParticipantAudioState {
  readonly echoCancellation?: boolean;
  readonly noiseSuppression?: boolean;
  readonly autoGainControl?: boolean;
}

/**
 * Returns the default audio constraints.
 *
 * Applied when getUserMedia is called without explicit audio constraints.
 *
 * @returns Default audio MediaTrackConstraints
 */
export function getDefaultAudioConstraints(): MediaTrackConstraints {
  return { ...DEFAULT_AUDIO_CONSTRAINTS };
}

/**
 * Returns the default video constraints.
 *
 * Applied when getUserMedia is called with video: true but no explicit
 * video constraints.
 *
 * @returns Default video MediaTrackConstraints
 */
export function getDefaultVideoConstraints(): MediaTrackConstraints {
  return { ...DEFAULT_VIDEO_CONSTRAINTS };
}

/**
 * Merges audio constraints from three layers with defined priority.
 *
 * Merge priority (highest wins):
 *   1. Server-side participant state (echoCancellation, noiseSuppression, autoGainControl)
 *   2. User/device constraints (from preferences or device switch)
 *   3. SDK defaults (echoCancellation: true, noiseSuppression: true, autoGainControl: true)
 *
 * Only defined fields in higher-priority layers override lower-priority values.
 * Undefined fields are skipped, preserving the value from a lower-priority layer.
 *
 * @param currentConstraints - The current track constraints (user/device layer)
 * @param participantState - The server-side participant audio flags
 * @param deviceConstraints - Additional constraints for the target device (e.g., deviceId)
 * @returns Merged MediaTrackConstraints
 *
 * @example
 * ```typescript
 * // User has EC off, server says NS on, defaults fill AGC
 * mergeAudioConstraints(
 *   { echoCancellation: false },
 *   { noiseSuppression: true },
 *   { deviceId: { exact: 'mic-123' } }
 * );
 * // Result: { autoGainControl: true, echoCancellation: false, noiseSuppression: true, deviceId: { exact: 'mic-123' } }
 * ```
 */
export function mergeAudioConstraints(
  currentConstraints: MediaTrackConstraints = {},
  participantState: ParticipantAudioState = {},
  deviceConstraints: MediaTrackConstraints = {}
): MediaTrackConstraints {
  // Start with SDK defaults (lowest priority)
  const defaults = getDefaultAudioConstraints();

  // Layer 2: user/device constraints override defaults
  const withUserPrefs: MediaTrackConstraints = {
    ...defaults,
    ...currentConstraints
  };

  // Layer 1: server-side participant state overrides everything (only defined fields)
  const merged: MediaTrackConstraints = { ...withUserPrefs };

  if (participantState.echoCancellation !== undefined) {
    (merged as Record<string, unknown>).echoCancellation = participantState.echoCancellation;
  }
  if (participantState.noiseSuppression !== undefined) {
    (merged as Record<string, unknown>).noiseSuppression = participantState.noiseSuppression;
  }
  if (participantState.autoGainControl !== undefined) {
    (merged as Record<string, unknown>).autoGainControl = participantState.autoGainControl;
  }

  // Layer: device-specific constraints (deviceId, groupId, etc.)
  // These are additive -- they don't conflict with audio processing flags
  return {
    ...merged,
    ...deviceConstraints
  };
}
