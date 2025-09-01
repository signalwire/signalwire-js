/**
 * WebRTC Stats Monitoring Interfaces and Type Definitions
 * This module contains all type definitions for the WebRTC stats monitoring feature
 */

/**
 * Types of network issues that can be detected
 */
export enum NetworkIssueType {
  HIGH_PACKET_LOSS = 'high_packet_loss',
  HIGH_JITTER = 'high_jitter',
  HIGH_LATENCY = 'high_latency',
  LOW_BANDWIDTH = 'low_bandwidth',
  CONNECTION_UNSTABLE = 'connection_unstable',
  MEDIA_QUALITY_DEGRADED = 'media_quality_degraded',
  ICE_CONNECTION_FAILED = 'ice_connection_failed',
  ICE_CONNECTION_DISCONNECTED = 'ice_connection_disconnected',
  NO_INBOUND_PACKETS = 'no_inbound_packets',
}

/**
 * Severity levels for network issues
 */
export type NetworkIssueSeverityLevel = 'warning' | 'critical'

/**
 * Represents a detected network issue
 */
export interface NetworkIssue {
  /** Type of the network issue */
  type: NetworkIssueType
  /** Severity level (0-1, where 1 is most severe) - kept for backward compatibility */
  severity: number
  /** Severity level as string enum - aligns with specification */
  severityLevel: NetworkIssueSeverityLevel
  /** Value that triggered the issue */
  value: number
  /** Threshold that was exceeded */
  threshold: number
  /** Timestamp when the issue was detected */
  timestamp: number
  /** Whether the issue is currently active */
  active: boolean
  /** Optional description of the issue */
  description?: string
  /** Media type affected (audio/video) */
  mediaType?: 'audio' | 'video'
  /** Track ID if issue is track-specific */
  trackId?: string
}

/**
 * Network quality levels
 */
export type NetworkQualityLevel =
  | 'excellent'
  | 'good'
  | 'fair'
  | 'poor'
  | 'critical'

/**
 * Represents the overall network quality
 */
export interface NetworkQuality {
  /** Overall quality level */
  level: NetworkQualityLevel
  /** Numeric score (0-100, where 100 is best) */
  score: number
  /** Current active issues */
  issues: NetworkIssue[]
  /** Timestamp of the assessment */
  timestamp: number
  /** Quality metrics for audio */
  audio?: {
    level: NetworkQualityLevel
    score: number
  }
  /** Quality metrics for video */
  video?: {
    level: NetworkQualityLevel
    score: number
  }
}

/**
 * Raw statistics metrics from WebRTC
 */
export interface StatsMetrics {
  /** Packet loss rate (0-1) */
  packetLoss: number
  /** Jitter in milliseconds */
  jitter: number
  /** Round-trip time in milliseconds */
  rtt: number
  /** Available bandwidth in kbps */
  bandwidth: number
  /** Number of packets sent */
  packetsSent: number
  /** Number of packets received */
  packetsReceived: number
  /** Number of bytes sent */
  bytesSent: number
  /** Number of bytes received */
  bytesReceived: number
  /** Timestamp when last packet was received */
  lastPacketReceivedTimestamp?: number
  /** Audio level (0-1) for audio tracks */
  audioLevel?: number
  /** Frame rate for video tracks */
  frameRate?: number
  /** Video resolution width */
  frameWidth?: number
  /** Video resolution height */
  frameHeight?: number
  /** Number of freeze events */
  freezeCount?: number
  /** Total pause duration in seconds */
  pauseCount?: number
  /** Total freeze duration in seconds */
  totalFreezesDuration?: number
  /** Total pause duration in seconds */
  totalPausesDuration?: number
  /** Timestamp of the metrics */
  timestamp: number
}

/**
 * Thresholds for detecting network issues
 */
export interface MonitoringThresholds {
  /** Packet loss threshold (0-1) */
  packetLoss?: number
  /** Jitter threshold in milliseconds */
  jitter?: number
  /** RTT threshold in milliseconds */
  rtt?: number
  /** Minimum bandwidth in kbps */
  minBandwidth?: number
  /** Minimum audio level for detection */
  minAudioLevel?: number
  /** Minimum video frame rate */
  minFrameRate?: number
  /** Maximum freeze count */
  maxFreezeCount?: number
  /** Maximum freeze duration in seconds */
  maxFreezeDuration?: number
  /** Custom thresholds for specific metrics */
  custom?: Record<string, number>
}

/**
 * Configuration options for monitoring
 */
export interface MonitoringOptions {
  /** Enable monitoring */
  enabled?: boolean
  /** Interval for collecting stats in milliseconds */
  interval?: number
  /** Enable detailed logging */
  verbose?: boolean
  /** Thresholds for issue detection */
  thresholds?: MonitoringThresholds
  /** Enable automatic recovery attempts */
  autoRecover?: boolean
  /** Maximum recovery attempts */
  maxRecoveryAttempts?: number
  /** Recovery backoff multiplier */
  recoveryBackoff?: number
  /** Enable baseline calculation */
  calculateBaseline?: boolean
  /** Baseline calculation duration in milliseconds */
  baselineDuration?: number
  /** Enable predictive analysis */
  enablePrediction?: boolean
  /** History size for trend analysis */
  historySize?: number
  /** Metrics to monitor */
  monitoredMetrics?: Array<keyof StatsMetrics>
  /** Enable adaptive thresholds */
  adaptiveThresholds?: boolean
  /** Adaptation rate for thresholds (0-1) */
  adaptationRate?: number
}

/**
 * Inbound RTP statistics
 */
export interface InboundRTPStats {
  /** Unique identifier for the stats object */
  id: string
  /** Timestamp of the stats */
  timestamp: number
  /** Media type (audio/video) */
  kind: 'audio' | 'video'
  /** Track identifier */
  trackId?: string
  /** SSRC identifier */
  ssrc: number
  /** Number of packets received */
  packetsReceived: number
  /** Number of packets lost */
  packetsLost: number
  /** Jitter in seconds */
  jitter: number
  /** Number of bytes received */
  bytesReceived: number
  /** Last packet received timestamp */
  lastPacketReceivedTimestamp?: number
  /** Header bytes received */
  headerBytesReceived?: number
  /** Packets discarded */
  packetsDiscarded?: number
  /** FEC packets received */
  fecPacketsReceived?: number
  /** FEC packets discarded */
  fecPacketsDiscarded?: number
  /** Concealed samples */
  concealedSamples?: number
  /** Silent concealed samples */
  silentConcealedSamples?: number
  /** Concealment events */
  concealmentEvents?: number
  /** Inserted samples for deceleration */
  insertedSamplesForDeceleration?: number
  /** Removed samples for acceleration */
  removedSamplesForAcceleration?: number
  /** Audio level */
  audioLevel?: number
  /** Total audio energy */
  totalAudioEnergy?: number
  /** Total samples duration */
  totalSamplesDuration?: number
  /** Frames received */
  framesReceived?: number
  /** Frame width */
  frameWidth?: number
  /** Frame height */
  frameHeight?: number
  /** Frames per second */
  framesPerSecond?: number
  /** Frames decoded */
  framesDecoded?: number
  /** Key frames decoded */
  keyFramesDecoded?: number
  /** Frames dropped */
  framesDropped?: number
  /** Total decode time */
  totalDecodeTime?: number
  /** Total inter-frame delay */
  totalInterFrameDelay?: number
  /** Total squared inter-frame delay */
  totalSquaredInterFrameDelay?: number
  /** Pause count */
  pauseCount?: number
  /** Total pauses duration */
  totalPausesDuration?: number
  /** Freeze count */
  freezeCount?: number
  /** Total freezes duration */
  totalFreezesDuration?: number
  /** Content type */
  contentType?: string
  /** Estimated playout timestamp */
  estimatedPlayoutTimestamp?: number
  /** Decoder implementation */
  decoderImplementation?: string
  /** FIR count */
  firCount?: number
  /** PLI count */
  pliCount?: number
  /** NACK count */
  nackCount?: number
  /** QP sum */
  qpSum?: number
}

/**
 * Connection statistics
 */
export interface ConnectionStats {
  /** Connection state */
  connectionState: RTCPeerConnectionState
  /** ICE connection state */
  iceConnectionState: RTCIceConnectionState
  /** ICE gathering state */
  iceGatheringState: RTCIceGatheringState
  /** Signaling state */
  signalingState: RTCSignalingState
  /** Data channels open */
  dataChannelsOpened?: number
  /** Data channels closed */
  dataChannelsClosed?: number
  /** Timestamp */
  timestamp: number
  /** Selected candidate pair */
  selectedCandidatePair?: {
    local: RTCIceCandidate
    remote: RTCIceCandidate
    state: RTCStatsIceCandidatePairState
    nominated: boolean
    bytesSent: number
    bytesReceived: number
    totalRoundTripTime: number
    currentRoundTripTime: number
    availableOutgoingBitrate?: number
    availableIncomingBitrate?: number
  }
}

/**
 * Computed metrics from raw stats
 */
export interface ComputedMetrics {
  /** Packet loss rate (0-1) */
  packetLossRate: number
  /** Average jitter in milliseconds */
  averageJitter: number
  /** Average RTT in milliseconds */
  averageRtt: number
  /** Current bandwidth in kbps */
  currentBandwidth: number
  /** Audio quality score (0-100) */
  audioQualityScore?: number
  /** Video quality score (0-100) */
  videoQualityScore?: number
  /** Overall quality score (0-100) */
  overallQualityScore: number
  /** Trend indicators */
  trends: {
    packetLoss: 'improving' | 'stable' | 'degrading'
    jitter: 'improving' | 'stable' | 'degrading'
    rtt: 'improving' | 'stable' | 'degrading'
    bandwidth: 'improving' | 'stable' | 'degrading'
  }
  /** Timestamp */
  timestamp: number
}

/**
 * Baseline metrics for comparison
 */
export interface Baseline {
  /** Average packet loss rate */
  packetLoss: number
  /** Average jitter */
  jitter: number
  /** Average RTT */
  rtt: number
  /** Average bandwidth */
  bandwidth: number
  /** Standard deviation of packet loss */
  packetLossStdDev: number
  /** Standard deviation of jitter */
  jitterStdDev: number
  /** Standard deviation of RTT */
  rttStdDev: number
  /** Standard deviation of bandwidth */
  bandwidthStdDev: number
  /** Number of samples used */
  sampleCount: number
  /** Timestamp when baseline was established */
  timestamp: number
  /** Confidence level (0-1) */
  confidence: number
}

/**
 * Types of recovery actions
 */
export enum RecoveryType {
  RESTART_ICE = 'restart_ice',
  RENEGOTIATE = 'renegotiate',
  REDUCE_QUALITY = 'reduce_quality',
  INCREASE_QUALITY = 'increase_quality',
  TOGGLE_TRACKS = 'toggle_tracks',
  CHANGE_CODEC = 'change_codec',
  ADJUST_BITRATE = 'adjust_bitrate',
  RECONNECT = 'reconnect',
  NONE = 'none',
}

/**
 * Recovery action configuration
 */
export type RecoveryAction = {
  /** Type of recovery action */
  type: RecoveryType
  /** Priority of the action (lower is higher priority) */
  priority: number
  /** Delay before attempting in milliseconds */
  delay?: number
  /** Parameters for the action */
  params?: Record<string, any>
  /** Conditions that must be met */
  conditions?: {
    minSeverity?: number
    issueTypes?: NetworkIssueType[]
    maxAttempts?: number
  }
}

/**
 * Information about a recovery attempt
 */
export interface RecoveryAttemptInfo {
  /** Type of recovery attempted */
  type: RecoveryType
  /** Whether the recovery was successful */
  success: boolean
  /** Timestamp of the attempt */
  timestamp: number
  /** Duration of the recovery in milliseconds */
  duration: number
  /** Error if recovery failed */
  error?: Error
  /** Metrics before recovery */
  metricsBefore: StatsMetrics
  /** Metrics after recovery */
  metricsAfter?: StatsMetrics
  /** Issues that triggered recovery */
  triggeredBy: NetworkIssue[]
}

/**
 * Event emitted when network quality changes
 */
export interface NetworkQualityChangedEvent {
  /** Type of the event */
  type: 'network.quality.changed'
  /** Current network quality */
  quality: NetworkQuality
  /** Previous network quality */
  previousQuality?: NetworkQuality
  /** Timestamp of the event */
  timestamp: number
}

/**
 * Event emitted when a network issue is detected
 */
export interface NetworkIssueDetectedEvent {
  /** Type of the event */
  type: 'network.issue.detected'
  /** The detected issue */
  issue: NetworkIssue
  /** Current network quality */
  quality: NetworkQuality
  /** Timestamp of the event */
  timestamp: number
}

/**
 * Event emitted when a network issue is resolved
 */
export interface NetworkIssueResolvedEvent {
  /** Type of the event */
  type: 'network.issue.resolved'
  /** The resolved issue */
  issue: NetworkIssue
  /** Duration the issue was active in milliseconds */
  duration: number
  /** Current network quality */
  quality: NetworkQuality
  /** Timestamp of the event */
  timestamp: number
}

/**
 * Event emitted when recovery is attempted
 */
export interface RecoveryAttemptedEvent {
  /** Type of the event */
  type: 'network.recovery.attempted'
  /** Recovery attempt information */
  attempt: RecoveryAttemptInfo
  /** Current network quality */
  quality: NetworkQuality
  /** Timestamp of the event */
  timestamp: number
}

/**
 * Event emitted when stats are collected
 */
export interface StatsCollectedEvent {
  /** Type of the event */
  type: 'stats.collected'
  /** Raw statistics */
  stats: StatsMetrics
  /** Computed metrics */
  computed: ComputedMetrics
  /** Current network quality */
  quality: NetworkQuality
  /** Timestamp of the event */
  timestamp: number
}

/**
 * Event emitted when monitoring starts
 */
export interface MonitoringStartedEvent {
  /** Type of the event */
  type: 'monitoring.started'
  /** Monitoring options */
  options: MonitoringOptions
  /** Timestamp of the event */
  timestamp: number
}

/**
 * Event emitted when monitoring stops
 */
export interface MonitoringStoppedEvent {
  /** Type of the event */
  type: 'monitoring.stopped'
  /** Reason for stopping */
  reason?: string
  /** Final statistics */
  finalStats?: StatsMetrics
  /** Timestamp of the event */
  timestamp: number
}

/**
 * Event emitted when baseline is established
 */
export interface BaselineEstablishedEvent {
  /** Type of the event */
  type: 'baseline.established'
  /** The established baseline */
  baseline: Baseline
  /** Number of samples used */
  sampleCount: number
  /** Timestamp of the event */
  timestamp: number
}

/**
 * Event emitted when thresholds are adapted
 */
export interface ThresholdsAdaptedEvent {
  /** Type of the event */
  type: 'thresholds.adapted'
  /** Previous thresholds */
  previousThresholds: MonitoringThresholds
  /** New thresholds */
  newThresholds: MonitoringThresholds
  /** Reason for adaptation */
  reason: string
  /** Timestamp of the event */
  timestamp: number
}

/**
 * Union type for all monitoring events
 */
export type MonitoringEvent =
  | NetworkQualityChangedEvent
  | NetworkIssueDetectedEvent
  | NetworkIssueResolvedEvent
  | RecoveryAttemptedEvent
  | StatsCollectedEvent
  | MonitoringStartedEvent
  | MonitoringStoppedEvent
  | BaselineEstablishedEvent
  | ThresholdsAdaptedEvent

/**
 * Stats monitor event handler type
 */
export type MonitoringEventHandler<
  T extends MonitoringEvent = MonitoringEvent
> = (event: T) => void

/**
 * Stats history entry
 */
export interface StatsHistoryEntry {
  /** Raw metrics */
  metrics: StatsMetrics
  /** Computed metrics */
  computed: ComputedMetrics
  /** Network quality at the time */
  quality: NetworkQuality
  /** Timestamp */
  timestamp: number
}

/**
 * Monitoring state
 */
export interface MonitoringState {
  /** Whether monitoring is active */
  isActive: boolean
  /** Current network quality */
  currentQuality: NetworkQuality
  /** Active issues */
  activeIssues: NetworkIssue[]
  /** Current baseline */
  baseline?: Baseline
  /** Stats history */
  history: StatsHistoryEntry[]
  /** Recovery attempts */
  recoveryAttempts: RecoveryAttemptInfo[]
  /** Last stats collection timestamp */
  lastStatsTimestamp?: number
  /** Monitoring start timestamp */
  startTimestamp?: number
}

/**
 * Media track statistics
 */
export interface MediaTrackStats {
  /** Track ID */
  trackId: string
  /** Track kind (audio/video) */
  kind: 'audio' | 'video'
  /** Whether track is enabled */
  enabled: boolean
  /** Whether track is muted */
  muted: boolean
  /** Track ready state */
  readyState: 'live' | 'ended'
  /** Inbound stats if receiving */
  inbound?: InboundRTPStats
  /** Outbound stats if sending */
  outbound?: {
    id: string
    timestamp: number
    ssrc: number
    packetsSent: number
    bytesSent: number
    targetBitrate?: number
    framesSent?: number
    framesEncoded?: number
    keyFramesEncoded?: number
    totalEncodeTime?: number
    totalPacketSendDelay?: number
    qualityLimitationReason?: string
    qualityLimitationDurations?: Record<string, number>
    nackCount?: number
    firCount?: number
    pliCount?: number
    qpSum?: number
  }
}

/**
 * Aggregated media statistics
 */
export interface AggregatedMediaStats {
  /** Audio tracks stats */
  audio: MediaTrackStats[]
  /** Video tracks stats */
  video: MediaTrackStats[]
  /** Total bandwidth usage */
  totalBandwidth: {
    inbound: number
    outbound: number
  }
  /** Aggregate quality scores */
  quality: {
    audio: number
    video: number
    overall: number
  }
  /** Timestamp */
  timestamp: number
}

/**
 * Prediction result for future network conditions
 */
export interface NetworkPrediction {
  /** Predicted quality level */
  predictedQuality: NetworkQualityLevel
  /** Confidence of prediction (0-1) */
  confidence: number
  /** Time horizon for prediction in milliseconds */
  horizon: number
  /** Predicted issues */
  predictedIssues: Array<{
    type: NetworkIssueType
    probability: number
    estimatedTime: number
  }>
  /** Recommended actions */
  recommendations: RecoveryAction[]
  /** Timestamp of prediction */
  timestamp: number
}

/**
 * Monitoring configuration preset
 */
export interface MonitoringPreset {
  /** Preset name */
  name: 'strict' | 'balanced' | 'relaxed' | 'custom'
  /** Preset options */
  options: MonitoringOptions
  /** Description */
  description: string
}

/**
 * Stats collector interface
 */
export interface IStatsCollector {
  /** Collect current statistics */
  collect(): Promise<StatsMetrics>
  /** Get specific metric */
  getMetric(name: keyof StatsMetrics): number | undefined
  /** Reset collector */
  reset(): void
}

/**
 * Issue detector interface
 */
export interface IIssueDetector {
  /** Detect issues from metrics */
  detect(
    metrics: StatsMetrics,
    thresholds: MonitoringThresholds
  ): NetworkIssue[]
  /** Update detection thresholds */
  updateThresholds(thresholds: MonitoringThresholds): void
  /** Get current thresholds */
  getThresholds(): MonitoringThresholds
}

/**
 * Recovery manager interface
 */
export interface IRecoveryManager {
  /** Attempt recovery for issues */
  attemptRecovery(issues: NetworkIssue[]): Promise<RecoveryAttemptInfo>
  /** Register recovery strategy */
  registerStrategy(
    type: RecoveryType,
    handler: (issues: NetworkIssue[]) => Promise<boolean>
  ): void
  /** Get recovery history */
  getHistory(): RecoveryAttemptInfo[]
}

/**
 * Stats monitor interface
 */
export interface IStatsMonitor {
  /** Start monitoring */
  start(options?: MonitoringOptions): void
  /** Stop monitoring */
  stop(): void
  /** Get current state */
  getState(): MonitoringState
  /** Get current quality */
  getQuality(): NetworkQuality
  /** Get statistics history */
  getHistory(limit?: number): StatsHistoryEntry[]
  /** Force stats collection */
  collectNow(): Promise<StatsMetrics>
  /** Update monitoring options */
  updateOptions(options: Partial<MonitoringOptions>): void
  /** Subscribe to events */
  on<T extends MonitoringEvent>(
    event: T['type'],
    handler: MonitoringEventHandler<T>
  ): void
  /** Unsubscribe from events */
  off<T extends MonitoringEvent>(
    event: T['type'],
    handler: MonitoringEventHandler<T>
  ): void
  /** Get predictions */
  getPrediction(horizon?: number): NetworkPrediction | null
  /** Trigger manual recovery */
  triggerRecovery(type: RecoveryType): Promise<RecoveryAttemptInfo>
}

/**
 * Utility functions for severity conversion
 */
export const SeverityUtils = {
  /**
   * Convert numeric severity to severity level
   * @param severity Numeric severity (0-1)
   * @returns Severity level ('warning' or 'critical')
   */
  toSeverityLevel(severity: number): NetworkIssueSeverityLevel {
    return severity >= 0.7 ? 'critical' : 'warning'
  },

  /**
   * Convert severity level to numeric severity
   * @param level Severity level
   * @returns Numeric severity (0-1)
   */
  toNumericSeverity(level: NetworkIssueSeverityLevel): number {
    return level === 'critical' ? 0.8 : 0.5
  },

  /**
   * Check if severity is critical
   * @param severity Numeric severity or level
   */
  isCritical(severity: number | NetworkIssueSeverityLevel): boolean {
    return typeof severity === 'number'
      ? severity >= 0.7
      : severity === 'critical'
  },

  /**
   * Check if severity is warning
   * @param severity Numeric severity or level
   */
  isWarning(severity: number | NetworkIssueSeverityLevel): boolean {
    if (typeof severity === 'number') {
      return severity >= 0.3 && severity < 0.7
    }
    return severity === 'warning'
  },

  /**
   * Create a NetworkIssue with synchronized severity values
   * @param baseIssue Issue data without severity
   * @param severity Numeric severity (0-1)
   * @returns Complete NetworkIssue with both severity fields
   */
  createIssueWithSeverity(
    baseIssue: Omit<NetworkIssue, 'severity' | 'severityLevel'>,
    severity: number
  ): NetworkIssue {
    return {
      ...baseIssue,
      severity,
      severityLevel: this.toSeverityLevel(severity),
    }
  },
}
