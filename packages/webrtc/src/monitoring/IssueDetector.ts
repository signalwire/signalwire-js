/**
 * WebRTC Network Issue Detection System
 *
 * This module provides comprehensive issue detection for WebRTC connections,
 * including detection algorithms for packet loss, RTT spikes, jitter issues,
 * bandwidth degradation, and connection state problems.
 */

import {
  NetworkIssue,
  NetworkIssueType,
  StatsMetrics,
  MonitoringThresholds,
  IIssueDetector,
  Baseline,
  ConnectionStats,
  SeverityUtils,
} from './interfaces'

import { DEFAULT_THRESHOLDS, WEBRTC_CONSTANTS } from './constants'

import { getLogger } from '@signalwire/core'

/**
 * Configuration for issue detection algorithms
 */
export interface IssueDetectorConfig {
  /** Whether to enable baseline-relative detection */
  enableBaselineDetection: boolean
  /** Whether to track issue history */
  trackHistory: boolean
  /** Maximum number of historical issues to retain */
  maxHistorySize: number
  /** Threshold for considering an issue resolved (time without detection) */
  resolvedThresholdMs: number
}

/**
 * Issue tracking information
 */
interface IssueTracker {
  /** Last time this issue was detected */
  lastDetectedAt: number
  /** Number of consecutive detections */
  consecutiveCount: number
  /** First time this issue was detected */
  firstDetectedAt: number
  /** Whether issue is currently active */
  active: boolean
}

/**
 * Comprehensive issue detector for WebRTC network problems
 *
 * Implements multiple detection algorithms:
 * - No inbound packets detection (2 second threshold)
 * - RTT spike detection (3x baseline multiplier)
 * - Packet loss detection (5% threshold)
 * - Jitter spike detection (4x baseline multiplier)
 * - Connection state monitoring (ICE disconnection, DTLS failures)
 * - Bandwidth degradation detection
 */
export class IssueDetector implements IIssueDetector {
  private thresholds: MonitoringThresholds
  private config: IssueDetectorConfig
  private baseline: Baseline | null = null
  private lastPacketTimestamp: number = 0
  private issueHistory: Map<string, IssueTracker> = new Map()
  private activeIssues: Map<string, NetworkIssue> = new Map()
  private readonly logger = getLogger()

  constructor(
    thresholds: MonitoringThresholds = {},
    config: Partial<IssueDetectorConfig> = {}
  ) {
    this.thresholds = {
      packetLoss: DEFAULT_THRESHOLDS.PACKET_LOSS_THRESHOLD,
      jitter: 50, // Default jitter threshold in ms
      rtt: 300, // Default RTT threshold in ms
      minBandwidth: 100, // Default minimum bandwidth in kbps
      ...thresholds,
    }

    this.config = {
      enableBaselineDetection: true,
      trackHistory: true,
      maxHistorySize: 100,
      resolvedThresholdMs: 10000, // 10 seconds
      ...config,
    }
  }

  /**
   * Detect network issues from current metrics
   */
  public detect(
    metrics: StatsMetrics,
    thresholds: MonitoringThresholds
  ): NetworkIssue[] {
    // Update thresholds if provided
    this.thresholds = { ...this.thresholds, ...thresholds }

    const issues: NetworkIssue[] = []
    const timestamp = Date.now()

    try {
      // 1. No inbound packets detection
      const noInboundPacketsIssue = this.detectNoInboundPackets(
        metrics,
        timestamp
      )
      if (noInboundPacketsIssue) issues.push(noInboundPacketsIssue)

      // 2. Packet loss detection
      const packetLossIssue = this.detectPacketLoss(metrics, timestamp)
      if (packetLossIssue) issues.push(packetLossIssue)

      // 3. RTT spike detection
      const rttIssue = this.detectRttSpike(metrics, timestamp)
      if (rttIssue) issues.push(rttIssue)

      // 4. Jitter spike detection
      const jitterIssue = this.detectJitterSpike(metrics, timestamp)
      if (jitterIssue) issues.push(jitterIssue)

      // 5. Bandwidth degradation detection
      const bandwidthIssue = this.detectBandwidthDegradation(metrics, timestamp)
      if (bandwidthIssue) issues.push(bandwidthIssue)

      // Update issue tracking
      this.updateIssueTracking(issues, timestamp)
    } catch (error) {
      this.logger.error('Error during issue detection:', error)
    }

    return issues
  }

  /**
   * Main detection method with additional functionality
   */
  public detectIssues(
    metrics: StatsMetrics,
    baseline?: Baseline
  ): NetworkIssue[] {
    if (baseline) {
      this.baseline = baseline
    }

    const issues = this.detect(metrics, this.thresholds)

    // Update active issues
    issues.forEach((issue) => {
      const key = this.getIssueKey(issue)
      this.activeIssues.set(key, issue)
    })

    return issues
  }

  /**
   * Add connection state related issues
   */
  public addConnectionStateIssue(
    connectionStats: ConnectionStats
  ): NetworkIssue[] {
    const issues: NetworkIssue[] = []
    const timestamp = Date.now()

    try {
      // Check ICE connection state
      if (
        WEBRTC_CONSTANTS.PROBLEMATIC_ICE_STATES.includes(
          connectionStats.iceConnectionState
        )
      ) {
        const severity =
          connectionStats.iceConnectionState === 'failed' ? 1.0 : 0.8
        const issue: NetworkIssue = {
          type:
            connectionStats.iceConnectionState === 'failed'
              ? NetworkIssueType.ICE_CONNECTION_FAILED
              : NetworkIssueType.ICE_CONNECTION_DISCONNECTED,
          severity,
          severityLevel: SeverityUtils.toSeverityLevel(severity),
          value: 1,
          threshold: 1,
          timestamp,
          active: true,
          description: `ICE connection state: ${connectionStats.iceConnectionState}`,
        }
        issues.push(issue)
      }

      // Check peer connection state
      if (
        WEBRTC_CONSTANTS.PROBLEMATIC_CONNECTION_STATES.includes(
          connectionStats.connectionState
        )
      ) {
        const severity =
          connectionStats.connectionState === 'failed' ? 1.0 : 0.7
        const issue: NetworkIssue = {
          type: NetworkIssueType.CONNECTION_UNSTABLE,
          severity,
          severityLevel: SeverityUtils.toSeverityLevel(severity),
          value: 1,
          threshold: 1,
          timestamp,
          active: true,
          description: `Peer connection state: ${connectionStats.connectionState}`,
        }
        issues.push(issue)
      }

      // Check signaling state
      if (
        WEBRTC_CONSTANTS.CONCERNING_SIGNALING_STATES.includes(
          connectionStats.signalingState
        )
      ) {
        const severity = 0.6
        const issue: NetworkIssue = {
          type: NetworkIssueType.CONNECTION_UNSTABLE,
          severity,
          severityLevel: SeverityUtils.toSeverityLevel(severity),
          value: 1,
          threshold: 1,
          timestamp,
          active: true,
          description: `Signaling state: ${connectionStats.signalingState}`,
        }
        issues.push(issue)
      }

      // Update tracking for connection issues
      this.updateIssueTracking(issues, timestamp)

      // Add to active issues
      issues.forEach((issue) => {
        const key = this.getIssueKey(issue)
        this.activeIssues.set(key, issue)
      })
    } catch (error) {
      this.logger.error('Error detecting connection state issues:', error)
    }

    return issues
  }

  /**
   * Get currently active issues
   */
  public getActiveIssues(): NetworkIssue[] {
    return Array.from(this.activeIssues.values()).filter(
      (issue) => issue.active
    )
  }

  /**
   * Clear resolved issues based on time threshold
   */
  public clearResolvedIssues(): void {
    const now = Date.now()
    const resolvedKeys: string[] = []

    // Check for resolved issues based on last detection time
    this.issueHistory.forEach((tracker, key) => {
      const timeSinceLastDetection = now - tracker.lastDetectedAt
      if (timeSinceLastDetection > this.config.resolvedThresholdMs) {
        tracker.active = false
        resolvedKeys.push(key)
      }
    })

    // Remove from active issues
    resolvedKeys.forEach((key) => {
      const issue = this.activeIssues.get(key)
      if (issue) {
        issue.active = false
        this.activeIssues.delete(key)
      }
    })

    // Clean up old history entries
    if (this.config.trackHistory) {
      this.cleanupHistory()
    }
  }

  /**
   * Update detection thresholds
   */
  public updateThresholds(thresholds: MonitoringThresholds): void {
    this.thresholds = { ...this.thresholds, ...thresholds }
  }

  /**
   * Get current thresholds
   */
  public getThresholds(): MonitoringThresholds {
    return { ...this.thresholds }
  }

  /**
   * Set baseline for relative detection
   */
  public setBaseline(baseline: Baseline): void {
    this.baseline = baseline
  }

  /**
   * Detect no inbound packets issue
   */
  private detectNoInboundPackets(
    metrics: StatsMetrics,
    timestamp: number
  ): NetworkIssue | null {
    // Update lastPacketReceivedTimestamp if we have new packets
    if (metrics.packetsReceived > 0) {
      // Use the provided timestamp or current time
      const packetTimestamp = metrics.lastPacketReceivedTimestamp || timestamp
      this.lastPacketTimestamp = packetTimestamp
      return null
    }

    // If we have no previous packet timestamp, initialize it
    if (this.lastPacketTimestamp === 0) {
      this.lastPacketTimestamp = timestamp
      return null
    }

    const timeSinceLastPacket = timestamp - this.lastPacketTimestamp
    const warningThreshold = DEFAULT_THRESHOLDS.NO_INBOUND_PACKETS_WARNING_MS
    const criticalThreshold = DEFAULT_THRESHOLDS.NO_INBOUND_PACKETS_CRITICAL_MS

    // Check if we've exceeded either threshold
    if (timeSinceLastPacket >= warningThreshold) {
      let severity: number

      if (timeSinceLastPacket >= criticalThreshold) {
        // Critical: 5+ seconds without packets
        severity = 0.8 // Critical level (>= 0.7)
      } else {
        // Warning: 2-5 seconds without packets
        severity = 0.5 // Warning level (0.3-0.7)
      }

      const severityLevel = SeverityUtils.toSeverityLevel(severity)

      return {
        type: NetworkIssueType.NO_INBOUND_PACKETS,
        severity,
        severityLevel,
        value: timeSinceLastPacket,
        threshold: warningThreshold,
        timestamp,
        active: true,
        description: `No inbound packets for ${Math.round(
          timeSinceLastPacket / 1000
        )}s (${severityLevel})`,
      }
    }

    return null
  }

  /**
   * Detect packet loss issues
   */
  private detectPacketLoss(
    metrics: StatsMetrics,
    timestamp: number
  ): NetworkIssue | null {
    if (metrics.packetLoss <= 0) return null

    const threshold =
      this.thresholds.packetLoss || DEFAULT_THRESHOLDS.PACKET_LOSS_THRESHOLD

    if (metrics.packetLoss >= threshold) {
      const severity = this.calculatePacketLossSeverity(
        metrics.packetLoss,
        threshold
      )

      return {
        type: NetworkIssueType.HIGH_PACKET_LOSS,
        severity,
        severityLevel: SeverityUtils.toSeverityLevel(severity),
        value: metrics.packetLoss,
        threshold,
        timestamp,
        active: true,
        description: `Packet loss: ${(metrics.packetLoss * 100).toFixed(1)}%`,
      }
    }

    return null
  }

  /**
   * Detect RTT spike issues
   */
  private detectRttSpike(
    metrics: StatsMetrics,
    timestamp: number
  ): NetworkIssue | null {
    if (metrics.rtt <= 0) return null

    let threshold: number
    let isBaselineRelative = false

    // Use baseline-relative detection if available and enabled
    if (this.config.enableBaselineDetection && this.baseline) {
      threshold = this.baseline.rtt * DEFAULT_THRESHOLDS.RTT_SPIKE_MULTIPLIER
      isBaselineRelative = true
    } else {
      // Use absolute threshold
      threshold = this.thresholds.rtt || 300
    }

    if (metrics.rtt >= threshold) {
      const severity = this.calculateRttSeverity(
        metrics.rtt,
        threshold,
        isBaselineRelative
      )

      return {
        type: NetworkIssueType.HIGH_LATENCY,
        severity,
        severityLevel: SeverityUtils.toSeverityLevel(severity),
        value: metrics.rtt,
        threshold,
        timestamp,
        active: true,
        description: isBaselineRelative
          ? `RTT spike: ${Math.round(metrics.rtt)}ms (${(
              metrics.rtt / (this.baseline!.rtt || 1)
            ).toFixed(1)}x baseline)`
          : `High RTT: ${Math.round(metrics.rtt)}ms`,
      }
    }

    return null
  }

  /**
   * Detect jitter spike issues
   */
  private detectJitterSpike(
    metrics: StatsMetrics,
    timestamp: number
  ): NetworkIssue | null {
    if (metrics.jitter <= 0) return null

    let threshold: number
    let isBaselineRelative = false

    // Use baseline-relative detection if available and enabled
    if (this.config.enableBaselineDetection && this.baseline) {
      threshold =
        this.baseline.jitter * DEFAULT_THRESHOLDS.JITTER_SPIKE_MULTIPLIER
      isBaselineRelative = true
    } else {
      // Use absolute threshold
      threshold = this.thresholds.jitter || 50
    }

    if (metrics.jitter >= threshold) {
      const severity = this.calculateJitterSeverity(
        metrics.jitter,
        threshold,
        isBaselineRelative
      )

      return {
        type: NetworkIssueType.HIGH_JITTER,
        severity,
        severityLevel: SeverityUtils.toSeverityLevel(severity),
        value: metrics.jitter,
        threshold,
        timestamp,
        active: true,
        description: isBaselineRelative
          ? `Jitter spike: ${Math.round(metrics.jitter)}ms (${(
              metrics.jitter / (this.baseline!.jitter || 1)
            ).toFixed(1)}x baseline)`
          : `High jitter: ${Math.round(metrics.jitter)}ms`,
      }
    }

    return null
  }

  /**
   * Detect bandwidth degradation issues
   */
  private detectBandwidthDegradation(
    metrics: StatsMetrics,
    timestamp: number
  ): NetworkIssue | null {
    if (metrics.bandwidth <= 0) return null

    let threshold: number
    let isBaselineRelative = false

    // Use baseline-relative detection if available and enabled
    if (this.config.enableBaselineDetection && this.baseline) {
      // Detect if bandwidth dropped significantly below baseline
      threshold = this.baseline.bandwidth * 0.5 // 50% of baseline
      isBaselineRelative = true
    } else {
      // Use absolute minimum threshold
      threshold = this.thresholds.minBandwidth || 100
    }

    if (metrics.bandwidth <= threshold) {
      const severity = this.calculateBandwidthSeverity(
        metrics.bandwidth,
        threshold,
        isBaselineRelative
      )

      return {
        type: NetworkIssueType.LOW_BANDWIDTH,
        severity,
        severityLevel: SeverityUtils.toSeverityLevel(severity),
        value: metrics.bandwidth,
        threshold,
        timestamp,
        active: true,
        description: isBaselineRelative
          ? `Bandwidth degradation: ${Math.round(metrics.bandwidth)}kbps (${(
              (metrics.bandwidth / (this.baseline!.bandwidth || 1)) *
              100
            ).toFixed(0)}% of baseline)`
          : `Low bandwidth: ${Math.round(metrics.bandwidth)}kbps`,
      }
    }

    return null
  }

  /**
   * Calculate severity for packet loss
   */
  private calculatePacketLossSeverity(
    packetLoss: number,
    threshold: number
  ): number {
    const criticalThreshold = DEFAULT_THRESHOLDS.CRITICAL_PACKET_LOSS_THRESHOLD

    if (packetLoss >= criticalThreshold) {
      return 1.0 // Critical
    }

    // Linear scaling between threshold and critical threshold
    const range = criticalThreshold - threshold
    const excessLoss = packetLoss - threshold
    return Math.min(1.0, 0.5 + (excessLoss / range) * 0.5)
  }

  /**
   * Calculate severity for RTT issues
   */
  private calculateRttSeverity(
    rtt: number,
    threshold: number,
    isBaselineRelative: boolean
  ): number {
    if (isBaselineRelative && this.baseline) {
      const criticalMultiplier = DEFAULT_THRESHOLDS.CRITICAL_RTT_MULTIPLIER
      const criticalThreshold = this.baseline.rtt * criticalMultiplier

      if (rtt >= criticalThreshold) {
        return 1.0 // Critical
      }

      // Scale between threshold and critical
      const range = criticalThreshold - threshold
      const excess = rtt - threshold
      return Math.min(1.0, 0.5 + (excess / range) * 0.5)
    } else {
      // Absolute RTT severity (assume critical at 1000ms)
      const criticalRtt = 1000
      if (rtt >= criticalRtt) {
        return 1.0
      }

      const range = criticalRtt - threshold
      const excess = rtt - threshold
      return Math.min(1.0, 0.5 + (excess / range) * 0.5)
    }
  }

  /**
   * Calculate severity for jitter issues
   */
  private calculateJitterSeverity(
    jitter: number,
    threshold: number,
    isBaselineRelative: boolean
  ): number {
    if (isBaselineRelative && this.baseline) {
      // Critical at 8x baseline jitter
      const criticalMultiplier = 8
      const criticalThreshold = this.baseline.jitter * criticalMultiplier

      if (jitter >= criticalThreshold) {
        return 1.0 // Critical
      }

      // Scale between threshold and critical
      const range = criticalThreshold - threshold
      const excess = jitter - threshold
      return Math.min(1.0, 0.5 + (excess / range) * 0.5)
    } else {
      // Absolute jitter severity (assume critical at 200ms)
      const criticalJitter = 200
      if (jitter >= criticalJitter) {
        return 1.0
      }

      const range = criticalJitter - threshold
      const excess = jitter - threshold
      return Math.min(1.0, 0.5 + (excess / range) * 0.5)
    }
  }

  /**
   * Calculate severity for bandwidth degradation
   */
  private calculateBandwidthSeverity(
    bandwidth: number,
    threshold: number,
    isBaselineRelative: boolean
  ): number {
    if (isBaselineRelative && this.baseline) {
      // Critical at 25% of baseline
      const criticalThreshold = this.baseline.bandwidth * 0.25

      if (bandwidth <= criticalThreshold) {
        return 1.0 // Critical
      }

      // Scale between critical and threshold
      const range = threshold - criticalThreshold
      const degradation = threshold - bandwidth
      return Math.min(1.0, 0.5 + (degradation / range) * 0.5)
    } else {
      // Absolute bandwidth severity (critical at 50kbps)
      const criticalBandwidth = 50
      if (bandwidth <= criticalBandwidth) {
        return 1.0
      }

      const range = threshold - criticalBandwidth
      const degradation = threshold - bandwidth
      return Math.min(1.0, 0.5 + (degradation / range) * 0.5)
    }
  }

  /**
   * Update issue tracking information
   */
  private updateIssueTracking(issues: NetworkIssue[], timestamp: number): void {
    if (!this.config.trackHistory) return

    // Update tracking for detected issues
    issues.forEach((issue) => {
      const key = this.getIssueKey(issue)
      const tracker = this.issueHistory.get(key)

      if (tracker) {
        tracker.lastDetectedAt = timestamp
        tracker.consecutiveCount++
        tracker.active = true
      } else {
        this.issueHistory.set(key, {
          lastDetectedAt: timestamp,
          consecutiveCount: 1,
          firstDetectedAt: timestamp,
          active: true,
        })
      }
    })
  }

  /**
   * Generate a unique key for issue tracking
   */
  private getIssueKey(issue: NetworkIssue): string {
    const parts: string[] = [issue.type]
    if (issue.mediaType) parts.push(issue.mediaType)
    if (issue.trackId) parts.push(issue.trackId)
    return parts.join(':')
  }

  /**
   * Clean up old history entries
   */
  private cleanupHistory(): void {
    const now = Date.now()
    const maxAge = 5 * 60 * 1000 // 5 minutes

    // Remove old inactive entries
    const keysToRemove: string[] = []
    this.issueHistory.forEach((tracker, key) => {
      if (!tracker.active && now - tracker.lastDetectedAt > maxAge) {
        keysToRemove.push(key)
      }
    })

    keysToRemove.forEach((key) => {
      this.issueHistory.delete(key)
    })

    // Limit history size
    if (this.issueHistory.size > this.config.maxHistorySize) {
      const entries = Array.from(this.issueHistory.entries())
      entries.sort((a, b) => b[1].lastDetectedAt - a[1].lastDetectedAt)

      // Keep only the most recent entries
      const toKeep = entries.slice(0, this.config.maxHistorySize)
      this.issueHistory.clear()
      toKeep.forEach(([key, tracker]) => {
        this.issueHistory.set(key, tracker)
      })
    }
  }

  /**
   * Get issue detection statistics
   */
  public getDetectionStats(): {
    totalIssuesDetected: number
    activeIssuesCount: number
    issueTypeBreakdown: Record<NetworkIssueType, number>
    averageDetectionTime: number
  } {
    const breakdown: Record<NetworkIssueType, number> = {} as Record<
      NetworkIssueType,
      number
    >
    let totalDetectionTime = 0
    let issuesWithDuration = 0

    this.issueHistory.forEach((tracker) => {
      if (!tracker.active) {
        const duration = tracker.lastDetectedAt - tracker.firstDetectedAt
        totalDetectionTime += duration
        issuesWithDuration++
      }
    })

    // Count active issues by type
    this.activeIssues.forEach((issue) => {
      breakdown[issue.type] = (breakdown[issue.type] || 0) + 1
    })

    return {
      totalIssuesDetected: this.issueHistory.size,
      activeIssuesCount: this.activeIssues.size,
      issueTypeBreakdown: breakdown,
      averageDetectionTime:
        issuesWithDuration > 0 ? totalDetectionTime / issuesWithDuration : 0,
    }
  }

  /**
   * Reset all tracking data
   */
  public reset(): void {
    this.issueHistory.clear()
    this.activeIssues.clear()
    this.lastPacketTimestamp = 0
    this.baseline = null
  }
}
