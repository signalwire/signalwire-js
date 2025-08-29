/**
 * WebRTC Stats Monitoring Constants
 * This module contains all constant values used for WebRTC stats monitoring
 * and network quality detection
 */

/**
 * Default threshold values for issue detection
 */
export const DEFAULT_THRESHOLDS = {
  /** Threshold for no inbound packets timeout in milliseconds */
  NO_PACKET_TIMEOUT_MS: 2000,

  /** Warning threshold for no inbound packets in milliseconds */
  NO_INBOUND_PACKETS_WARNING_MS: 2000,

  /** Critical threshold for no inbound packets in milliseconds */
  NO_INBOUND_PACKETS_CRITICAL_MS: 5000,

  /** Multiplier for RTT spike detection (current RTT > baseline * multiplier) */
  RTT_SPIKE_MULTIPLIER: 3,

  /** Threshold for packet loss rate (0-1, where 0.05 = 5%) */
  PACKET_LOSS_THRESHOLD: 0.05,

  /** Multiplier for jitter spike detection (current jitter > baseline * multiplier) */
  JITTER_SPIKE_MULTIPLIER: 4,

  /** Critical packet loss threshold (0-1, where 0.1 = 10%) */
  CRITICAL_PACKET_LOSS_THRESHOLD: 0.1,

  /** Critical RTT multiplier for baseline comparison */
  CRITICAL_RTT_MULTIPLIER: 5,

  /** Timeout for extended no packets scenario in milliseconds */
  EXTENDED_NO_PACKETS_TIMEOUT_MS: 3000,

  /** Timeout for critical connection state duration in milliseconds */
  CRITICAL_CONNECTION_TIMEOUT_MS: 5000,
} as const

/**
 * Polling intervals for different platforms
 */
export const POLLING_INTERVALS = {
  /** Default polling interval for desktop platforms in milliseconds */
  DESKTOP_DEFAULT: 1000,

  /** Default polling interval for mobile platforms in milliseconds */
  MOBILE_DEFAULT: 500,

  /** Faster polling interval during active issues on desktop in milliseconds */
  DESKTOP_ISSUES: 500,

  /** Faster polling interval during active issues on mobile in milliseconds */
  MOBILE_ISSUES: 300,

  /** Slower polling interval when network is healthy on desktop in milliseconds */
  DESKTOP_HEALTHY: 2000,

  /** Slower polling interval when network is healthy on mobile in milliseconds */
  MOBILE_HEALTHY: 1000,
} as const

/**
 * Recovery debounce times and rate limiting
 */
export const RECOVERY_TIMING = {
  /** Debounce time between recovery attempts in milliseconds */
  RECOVERY_DEBOUNCE_MS: 10000,

  /** Delay before allowing keyframe request recovery in milliseconds */
  KEYFRAME_DEBOUNCE_MS: 5000,

  /** Delay before allowing ICE restart recovery in milliseconds */
  ICE_RESTART_DEBOUNCE_MS: 15000,

  /** Delay before allowing renegotiation recovery in milliseconds */
  RENEGOTIATION_DEBOUNCE_MS: 20000,

  /** General recovery cooldown period in milliseconds */
  RECOVERY_COOLDOWN_MS: 30000,
} as const

/**
 * Maximum retry attempts for different recovery actions
 */
export const MAX_RECOVERY_ATTEMPTS = {
  /** Maximum keyframe request attempts */
  KEYFRAME_REQUESTS: 3,

  /** Maximum ICE restart attempts */
  ICE_RESTARTS: 2,

  /** Maximum renegotiation attempts */
  RENEGOTIATIONS: 1,

  /** Maximum total recovery attempts across all types */
  TOTAL_ATTEMPTS: 5,

  /** Reset recovery attempt counters after this duration in milliseconds */
  RESET_ATTEMPTS_AFTER_MS: 300000, // 5 minutes
} as const

/**
 * Baseline establishment configuration
 */
export const BASELINE_CONFIG = {
  /** Duration for establishing baseline in milliseconds */
  BASELINE_WINDOW_MS: 5000,

  /** Minimum number of samples required for baseline calculation */
  MIN_BASELINE_SAMPLES: 5,

  /** Maximum number of samples to use for baseline calculation */
  MAX_BASELINE_SAMPLES: 10,

  /** Confidence threshold for baseline validity (0-1) */
  BASELINE_CONFIDENCE_THRESHOLD: 0.7,

  /** Time after which baseline should be recalculated in milliseconds */
  BASELINE_REFRESH_INTERVAL_MS: 300000, // 5 minutes
} as const

/**
 * History retention limits
 */
export const HISTORY_LIMITS = {
  /** Maximum number of metrics history entries to retain */
  METRICS_HISTORY_SIZE: 30,

  /** Maximum number of issue history entries to retain */
  ISSUES_HISTORY_SIZE: 100,

  /** Maximum number of recovery attempt history entries to retain */
  RECOVERY_HISTORY_SIZE: 50,

  /** Duration to retain historical data in milliseconds */
  HISTORY_RETENTION_MS: 1800000, // 30 minutes

  /** Cleanup interval for removing stale history entries in milliseconds */
  HISTORY_CLEANUP_INTERVAL_MS: 60000, // 1 minute
} as const

/**
 * Issue detection thresholds and criteria
 */
export const ISSUE_DETECTION = {
  /** Number of critical issues required to trigger Tier 3 recovery */
  CRITICAL_ISSUE_COUNT_TIER3: 3,

  /** Number of warning issues required to trigger Tier 2 recovery */
  WARNING_ISSUE_COUNT_TIER2: 2,

  /** Number of critical issues + warnings to trigger Tier 3 recovery */
  MIXED_ISSUE_TIER3_CRITICAL: 1,
  MIXED_ISSUE_TIER3_WARNING: 2,

  /** Duration after which unresolved issues are considered stale in milliseconds */
  ISSUE_STALE_TIMEOUT_MS: 10000,

  /** Maximum duration to track a single issue in milliseconds */
  ISSUE_MAX_DURATION_MS: 60000,

  /** Minimum severity level for issue tracking (0-1) */
  MIN_TRACKABLE_SEVERITY: 0.1,
} as const

/**
 * Recovery tier thresholds
 */
export const RECOVERY_TIERS = {
  /** Tier 1: Warning level - log and monitor only */
  TIER1: {
    MIN_WARNING_ISSUES: 1,
    MIN_CRITICAL_ISSUES: 0,
    ACTIONS: ['log', 'monitor'] as const,
  },

  /** Tier 2: Recovery level - keyframe request and media recovery */
  TIER2: {
    MIN_WARNING_ISSUES: 2,
    MIN_CRITICAL_ISSUES: 1,
    ACTIONS: ['keyframe_request', 'media_recovery'] as const,
  },

  /** Tier 3: ICE restart level - full renegotiation */
  TIER3: {
    MIN_WARNING_ISSUES: 2,
    MIN_CRITICAL_ISSUES: 3,
    MIXED_CRITICAL: 1,
    MIXED_WARNING: 2,
    ACTIONS: ['ice_restart', 'renegotiation', 'reinvite'] as const,
  },
} as const

/**
 * Network quality scoring
 */
export const QUALITY_SCORING = {
  /** Excellent quality score threshold (0-100) */
  EXCELLENT_THRESHOLD: 90,

  /** Good quality score threshold (0-100) */
  GOOD_THRESHOLD: 75,

  /** Fair quality score threshold (0-100) */
  FAIR_THRESHOLD: 50,

  /** Poor quality score threshold (0-100) */
  POOR_THRESHOLD: 25,

  /** Critical quality score threshold (0-100) */
  CRITICAL_THRESHOLD: 10,

  /** Weights for different metrics in quality calculation */
  QUALITY_WEIGHTS: {
    PACKET_LOSS: 0.4,
    RTT: 0.3,
    JITTER: 0.2,
    BANDWIDTH: 0.1,
  },
} as const

/**
 * Platform-specific constants
 */
export const PLATFORM_CONFIG = {
  /** User agent patterns for mobile device detection */
  MOBILE_USER_AGENTS: [
    /Android/i,
    /iPhone/i,
    /iPad/i,
    /iPod/i,
    /BlackBerry/i,
    /Windows Phone/i,
    /Mobile/i,
  ],

  /** Reduced monitoring features for mobile to preserve battery */
  MOBILE_OPTIMIZATIONS: {
    REDUCE_POLLING_FREQUENCY: true,
    DISABLE_PREDICTIVE_ANALYSIS: true,
    LIMIT_HISTORY_SIZE: true,
    SIMPLIFIED_RECOVERY: true,
  },

  /** Desktop-specific configurations */
  DESKTOP_FEATURES: {
    ENABLE_FULL_MONITORING: true,
    ENABLE_PREDICTIVE_ANALYSIS: true,
    FULL_HISTORY_RETENTION: true,
    ADVANCED_RECOVERY: true,
  },
} as const

/**
 * Monitoring state timeouts
 */
export const STATE_TIMEOUTS = {
  /** Timeout for monitoring initialization in milliseconds */
  INIT_TIMEOUT_MS: 10000,

  /** Timeout for stats collection in milliseconds */
  STATS_COLLECTION_TIMEOUT_MS: 5000,

  /** Timeout for recovery action completion in milliseconds */
  RECOVERY_ACTION_TIMEOUT_MS: 30000,

  /** Timeout for baseline establishment in milliseconds */
  BASELINE_ESTABLISHMENT_TIMEOUT_MS: 15000,

  /** Heartbeat interval for monitoring health checks in milliseconds */
  MONITORING_HEARTBEAT_MS: 30000,
} as const

/**
 * Event emission thresholds
 */
export const EVENT_THRESHOLDS = {
  /** Minimum change in quality score to emit quality change event */
  MIN_QUALITY_CHANGE: 5,

  /** Debounce time for quality change events in milliseconds */
  QUALITY_EVENT_DEBOUNCE_MS: 1000,

  /** Maximum events per second to prevent flooding */
  MAX_EVENTS_PER_SECOND: 10,

  /** Throttle duration for repeated similar events in milliseconds */
  EVENT_THROTTLE_MS: 3000,
} as const

/**
 * Default monitoring options
 */
export const DEFAULT_MONITORING_OPTIONS = {
  /** Default polling interval */
  POLL_INTERVAL: POLLING_INTERVALS.DESKTOP_DEFAULT,

  /** Default history size */
  HISTORY_SIZE: HISTORY_LIMITS.METRICS_HISTORY_SIZE,

  /** Default baseline calculation */
  CALCULATE_BASELINE: true,

  /** Default baseline duration */
  BASELINE_DURATION: BASELINE_CONFIG.BASELINE_WINDOW_MS,

  /** Default auto recovery */
  AUTO_RECOVERY: true,

  /** Default maximum recovery attempts */
  MAX_RECOVERY_ATTEMPTS: MAX_RECOVERY_ATTEMPTS.TOTAL_ATTEMPTS,

  /** Default recovery backoff multiplier */
  RECOVERY_BACKOFF: 1.5,

  /** Default adaptive thresholds */
  ADAPTIVE_THRESHOLDS: false,

  /** Default adaptation rate */
  ADAPTATION_RATE: 0.1,

  /** Default verbose logging */
  VERBOSE_LOGGING: false,
} as const

/**
 * WebRTC API specific constants
 */
export const WEBRTC_CONSTANTS = {
  /** Stats report types we monitor */
  MONITORED_STATS_TYPES: [
    'inbound-rtp',
    'outbound-rtp',
    'candidate-pair',
    'local-candidate',
    'remote-candidate',
    'track',
    'media-source',
    'media-playout',
  ] as const,

  /** Connection states that indicate problems */
  PROBLEMATIC_CONNECTION_STATES: [
    'disconnected',
    'failed',
    'closed',
  ] as RTCPeerConnectionState[],

  /** ICE connection states that indicate problems */
  PROBLEMATIC_ICE_STATES: [
    'disconnected',
    'failed',
    'closed',
  ] as RTCIceConnectionState[],

  /** Signaling states that might indicate issues */
  CONCERNING_SIGNALING_STATES: ['closed'] as RTCSignalingState[],
} as const

/**
 * Mathematical constants for statistical calculations
 */
export const MATH_CONSTANTS = {
  /** Standard deviations for outlier detection */
  OUTLIER_DETECTION_SIGMA: 2,

  /** Moving average window size */
  MOVING_AVERAGE_WINDOW: 5,

  /** Exponential smoothing factor */
  EXPONENTIAL_SMOOTHING_ALPHA: 0.3,

  /** Minimum data points for trend analysis */
  MIN_TREND_SAMPLES: 3,

  /** Correlation threshold for trend detection */
  TREND_CORRELATION_THRESHOLD: 0.7,
} as const

/**
 * Error handling constants
 */
export const ERROR_HANDLING = {
  /** Maximum number of consecutive errors before stopping monitoring */
  MAX_CONSECUTIVE_ERRORS: 5,

  /** Backoff delay after errors in milliseconds */
  ERROR_BACKOFF_MS: 5000,

  /** Maximum backoff delay in milliseconds */
  MAX_ERROR_BACKOFF_MS: 60000,

  /** Error backoff multiplier */
  ERROR_BACKOFF_MULTIPLIER: 2,
} as const

/**
 * Type-safe constant validation
 */
export type MonitoringConstants = {
  readonly DEFAULT_THRESHOLDS: typeof DEFAULT_THRESHOLDS
  readonly POLLING_INTERVALS: typeof POLLING_INTERVALS
  readonly RECOVERY_TIMING: typeof RECOVERY_TIMING
  readonly MAX_RECOVERY_ATTEMPTS: typeof MAX_RECOVERY_ATTEMPTS
  readonly BASELINE_CONFIG: typeof BASELINE_CONFIG
  readonly HISTORY_LIMITS: typeof HISTORY_LIMITS
  readonly ISSUE_DETECTION: typeof ISSUE_DETECTION
  readonly RECOVERY_TIERS: typeof RECOVERY_TIERS
  readonly QUALITY_SCORING: typeof QUALITY_SCORING
  readonly PLATFORM_CONFIG: typeof PLATFORM_CONFIG
  readonly STATE_TIMEOUTS: typeof STATE_TIMEOUTS
  readonly EVENT_THRESHOLDS: typeof EVENT_THRESHOLDS
  readonly DEFAULT_MONITORING_OPTIONS: typeof DEFAULT_MONITORING_OPTIONS
  readonly WEBRTC_CONSTANTS: typeof WEBRTC_CONSTANTS
  readonly MATH_CONSTANTS: typeof MATH_CONSTANTS
  readonly ERROR_HANDLING: typeof ERROR_HANDLING
}

/**
 * Consolidated constants object for easy access
 */
export const MONITORING_CONSTANTS: MonitoringConstants = {
  DEFAULT_THRESHOLDS,
  POLLING_INTERVALS,
  RECOVERY_TIMING,
  MAX_RECOVERY_ATTEMPTS,
  BASELINE_CONFIG,
  HISTORY_LIMITS,
  ISSUE_DETECTION,
  RECOVERY_TIERS,
  QUALITY_SCORING,
  PLATFORM_CONFIG,
  STATE_TIMEOUTS,
  EVENT_THRESHOLDS,
  DEFAULT_MONITORING_OPTIONS,
  WEBRTC_CONSTANTS,
  MATH_CONSTANTS,
  ERROR_HANDLING,
} as const

/**
 * Helper function to get platform-specific polling interval
 */
export function getPlatformPollingInterval(
  isMobile: boolean,
  hasIssues: boolean
): number {
  if (isMobile) {
    return hasIssues
      ? POLLING_INTERVALS.MOBILE_ISSUES
      : POLLING_INTERVALS.MOBILE_DEFAULT
  }
  return hasIssues
    ? POLLING_INTERVALS.DESKTOP_ISSUES
    : POLLING_INTERVALS.DESKTOP_DEFAULT
}

/**
 * Helper function to determine if device is mobile
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false

  return PLATFORM_CONFIG.MOBILE_USER_AGENTS.some((pattern) =>
    pattern.test(navigator.userAgent)
  )
}

/**
 * Helper function to get recovery tier based on issues
 */
export function getRecoveryTier(
  warningCount: number,
  criticalCount: number
): 1 | 2 | 3 {
  // Tier 3: ICE restart level
  if (
    criticalCount >= RECOVERY_TIERS.TIER3.MIN_CRITICAL_ISSUES ||
    (criticalCount >= RECOVERY_TIERS.TIER3.MIXED_CRITICAL &&
      warningCount >= RECOVERY_TIERS.TIER3.MIXED_WARNING)
  ) {
    return 3
  }

  // Tier 2: Recovery level
  if (
    criticalCount >= RECOVERY_TIERS.TIER2.MIN_CRITICAL_ISSUES ||
    warningCount >= RECOVERY_TIERS.TIER2.MIN_WARNING_ISSUES
  ) {
    return 2
  }

  // Tier 1: Warning level
  return 1
}

/**
 * Helper function to calculate network quality score
 */
export function calculateQualityScore(
  packetLoss: number,
  rtt: number,
  jitter: number,
  bandwidth: number,
  baselineRtt: number = 100,
  baselineJitter: number = 10
): number {
  const weights = QUALITY_SCORING.QUALITY_WEIGHTS

  // Normalize metrics (0-100 scale, where 100 is best)
  const packetLossScore = Math.max(0, 100 - packetLoss * 100 * 10) // 10% loss = 0 score
  const rttScore = Math.max(0, 100 - (rtt / baselineRtt) * 50) // 2x baseline = 50 score
  const jitterScore = Math.max(0, 100 - (jitter / baselineJitter) * 50) // 2x baseline = 50 score
  const bandwidthScore = Math.min(100, bandwidth / 10) // 1000 kbps = 100 score

  const totalScore =
    packetLossScore * weights.PACKET_LOSS +
    rttScore * weights.RTT +
    jitterScore * weights.JITTER +
    bandwidthScore * weights.BANDWIDTH

  return Math.round(Math.max(0, Math.min(100, totalScore)))
}

/**
 * Helper function to get quality level from score
 */
export function getQualityLevel(
  score: number
): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
  if (score >= QUALITY_SCORING.EXCELLENT_THRESHOLD) return 'excellent'
  if (score >= QUALITY_SCORING.GOOD_THRESHOLD) return 'good'
  if (score >= QUALITY_SCORING.FAIR_THRESHOLD) return 'fair'
  if (score >= QUALITY_SCORING.POOR_THRESHOLD) return 'poor'
  return 'critical'
}
