/**
 * MOS (Mean Opinion Score) quality computation based on the simplified
 * ITU-T G.107 E-model.
 *
 * Provides a single 1-5 number that applications can use for a
 * green / yellow / red quality indicator without understanding raw
 * jitter and packet-loss values.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QualityLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** E-model base R factor for a perfect channel. */
const E_MODEL_BASE_R = 93.2;

/** Delay/jitter weight factor. */
const E_MODEL_DELAY_WEIGHT = 0.024;

/** Packet-loss weight factor. */
const E_MODEL_LOSS_WEIGHT = 2.5;

/** R-factor valid range for the E-model polynomial. */
const R_FACTOR_MIN = 0;
const R_FACTOR_MAX = 100;

/** Lower bound for MOS. */
const MOS_MIN = 1.0;

/** Upper bound for MOS. */
const MOS_MAX = 5.0;

/** MOS threshold boundaries (lower bound of each level). */
const MOS_EXCELLENT_THRESHOLD = 4.0;
const MOS_GOOD_THRESHOLD = 3.5;
const MOS_FAIR_THRESHOLD = 3.0;
const MOS_POOR_THRESHOLD = 2.0;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute a Mean Opinion Score from network metrics using the simplified
 * E-model formula (ITU-T G.107).
 *
 * ```
 * R   = 93.2 - (rtt/2 + jitter) * 0.024 - packetLoss * 2.5
 * MOS = 1 + 0.035 * R + R * (R - 60) * (100 - R) * 7e-6
 * ```
 *
 * @param rtt         Round-trip time in milliseconds
 * @param jitter      Jitter in milliseconds
 * @param packetLoss  Packet loss as a percentage (e.g. 5 means 5%)
 * @returns MOS value clamped to [1.0, 5.0]
 */
export function computeMOS(rtt: number, jitter: number, packetLoss: number): number {
  const rawR =
    E_MODEL_BASE_R - (rtt / 2 + jitter) * E_MODEL_DELAY_WEIGHT - packetLoss * E_MODEL_LOSS_WEIGHT;

  // Clamp R to [0, 100] — the MOS polynomial is only valid in this range
  const r = Math.min(R_FACTOR_MAX, Math.max(R_FACTOR_MIN, rawR));

  const mos = 1 + 0.035 * r + r * (r - 60) * (100 - r) * 7e-6;

  return Math.min(MOS_MAX, Math.max(MOS_MIN, mos));
}

/**
 * Map a numeric MOS score to a human-readable quality level.
 *
 * | MOS Range   | Level       |
 * |-------------|-------------|
 * | 4.0 - 5.0   | excellent   |
 * | 3.5 - 4.0   | good        |
 * | 3.0 - 3.5   | fair        |
 * | 2.0 - 3.0   | poor        |
 * | 1.0 - 2.0   | critical    |
 */
export function mosToQualityLevel(mos: number): QualityLevel {
  if (mos >= MOS_EXCELLENT_THRESHOLD) {
    return 'excellent';
  }
  if (mos >= MOS_GOOD_THRESHOLD) {
    return 'good';
  }
  if (mos >= MOS_FAIR_THRESHOLD) {
    return 'fair';
  }
  if (mos >= MOS_POOR_THRESHOLD) {
    return 'poor';
  }
  return 'critical';
}
