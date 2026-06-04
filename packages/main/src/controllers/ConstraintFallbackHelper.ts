/**
 * ConstraintFallbackHelper - Provides getUserMedia with automatic constraint
 * fallback on OverconstrainedError.
 *
 * When a specific device ID is requested, the helper tries progressively
 * looser constraints:
 *   1. `{ deviceId: { exact: deviceId } }` -- exact match
 *   2. `{ deviceId: deviceId }` -- preferred (browser may pick another)
 *   3. `{}` -- no constraint, browser default
 *
 * This prevents stale device IDs from blocking call setup.
 *
 * @see Section 5.8 and Section 11 of the Implementation Guide
 */

import { getLogger } from '../utils/logger';

import type { WebRTCMediaDevices } from '../dependencies/interfaces';

const logger = getLogger();

/** The constraint level that succeeded in getUserMedia. */
export type FallbackLevel = 'exact' | 'preferred' | 'default';

/** Result of a getUserMedia call with fallback information. */
export interface GetUserMediaFallbackResult {
  /** The acquired media stream. */
  readonly stream: MediaStream;
  /** Which constraint level succeeded. */
  readonly fallbackLevel: FallbackLevel;
}

/**
 * Attempts getUserMedia with progressively looser constraints.
 *
 * The function tries three levels of constraint specificity for the given
 * device kind. Each level is only attempted if the previous one fails with
 * an OverconstrainedError. Non-OverconstrainedError failures (e.g.,
 * NotAllowedError) are thrown immediately without fallback.
 *
 * @param mediaDevices - The media devices API to use
 * @param constraints - The full MediaStreamConstraints to use as a base
 * @param kind - Which track kind to apply fallback to ('audio' | 'video')
 * @param deviceId - The device ID to try (if undefined, calls getUserMedia as-is)
 * @returns The stream and the fallback level that succeeded
 * @throws When all fallback levels fail, or when a non-OverconstrainedError occurs
 */
export async function getUserMediaWithFallback(
  mediaDevices: WebRTCMediaDevices,
  constraints: MediaStreamConstraints,
  kind: 'audio' | 'video',
  deviceId?: string
): Promise<GetUserMediaFallbackResult> {
  // If no deviceId specified, just call getUserMedia directly
  if (!deviceId) {
    const stream = await mediaDevices.getUserMedia(constraints);
    return { stream, fallbackLevel: 'default' };
  }

  const baseConstraints = typeof constraints[kind] === 'object' ? constraints[kind] : {};

  // Level 1: exact match
  try {
    const exactConstraints: MediaStreamConstraints = {
      ...constraints,
      [kind]: {
        ...baseConstraints,
        deviceId: { exact: deviceId }
      }
    };
    const stream = await mediaDevices.getUserMedia(exactConstraints);
    return { stream, fallbackLevel: 'exact' };
  } catch (error) {
    if (!isOverconstrainedError(error)) {
      throw error;
    }
    logger.debug(
      `[ConstraintFallbackHelper] Exact constraint failed for ${kind}, trying preferred`,
      { deviceId }
    );
  }

  // Level 2: preferred match
  try {
    const preferredConstraints: MediaStreamConstraints = {
      ...constraints,
      [kind]: {
        ...baseConstraints,
        deviceId
      }
    };
    const stream = await mediaDevices.getUserMedia(preferredConstraints);
    return { stream, fallbackLevel: 'preferred' };
  } catch (error) {
    if (!isOverconstrainedError(error)) {
      throw error;
    }
    logger.debug(
      `[ConstraintFallbackHelper] Preferred constraint failed for ${kind}, trying default`,
      { deviceId }
    );
  }

  // Level 3: no device constraint (browser default)
  try {
    const defaultConstraints: MediaStreamConstraints = {
      ...constraints,
      [kind]: {
        ...baseConstraints
      }
    };
    // Remove deviceId from constraints if it was in the base
    if (typeof defaultConstraints[kind] === 'object') {
      const { deviceId: _removed, ...rest } = defaultConstraints[kind] as Record<string, unknown>;
      defaultConstraints[kind] = rest as MediaTrackConstraints;
    }

    const stream = await mediaDevices.getUserMedia(defaultConstraints);
    logger.warn(`[ConstraintFallbackHelper] Fell back to browser default for ${kind}`, {
      requestedDeviceId: deviceId
    });
    return { stream, fallbackLevel: 'default' };
  } catch (error) {
    logger.error(`[ConstraintFallbackHelper] All fallback levels exhausted for ${kind}`, {
      deviceId,
      error
    });
    throw error;
  }
}

/**
 * Checks whether an error is an OverconstrainedError.
 *
 * Browsers may throw either a native OverconstrainedError or a DOMException
 * with a specific name.
 */
function isOverconstrainedError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError';
  }
  return false;
}
