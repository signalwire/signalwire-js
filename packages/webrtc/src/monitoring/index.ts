/**
 * WebRTC Stats Monitoring - Public API
 *
 * This module exports the main components and types for WebRTC connection
 * quality monitoring, issue detection, and automatic recovery.
 */

// Main monitoring class
export { WebRTCStatsMonitor } from './WebRTCStatsMonitor'
import { WebRTCStatsMonitor } from './WebRTCStatsMonitor'
import { NetworkQualityLevel } from './interfaces'

// Individual components (for advanced use cases)
export { MetricsCollector } from './MetricsCollector'
export { IssueDetector } from './IssueDetector'
export { RecoveryManager } from './RecoveryManager'
export { BaselineManager } from './BaselineManager'

// Types and interfaces
export type {
  // Main interfaces
  IStatsMonitor,
  IStatsCollector,
  IIssueDetector,
  IRecoveryManager,

  // Configuration
  MonitoringOptions,
  MonitoringThresholds,
  MonitoringPreset,

  // State and quality
  MonitoringState,
  NetworkQuality,
  NetworkQualityLevel,
  NetworkIssueSeverityLevel,

  // Issues and recovery
  NetworkIssue,
  RecoveryAction,
  RecoveryAttemptInfo,

  // Metrics
  StatsMetrics,
  ComputedMetrics,
  InboundRTPStats,
  ConnectionStats,
  MediaTrackStats,
  AggregatedMediaStats,

  // History and analysis
  StatsHistoryEntry,
  Baseline,
  NetworkPrediction,

  // Events
  MonitoringEvent,
  MonitoringEventHandler,
  NetworkQualityChangedEvent,
  NetworkIssueDetectedEvent,
  NetworkIssueResolvedEvent,
  RecoveryAttemptedEvent,
  StatsCollectedEvent,
  MonitoringStartedEvent,
  MonitoringStoppedEvent,
  BaselineEstablishedEvent,
  ThresholdsAdaptedEvent,
} from './interfaces'

// Enums and utilities
export { NetworkIssueType, RecoveryType, SeverityUtils } from './interfaces'

// Constants
export {
  DEFAULT_THRESHOLDS,
  POLLING_INTERVALS,
  RECOVERY_TIMING,
  MAX_RECOVERY_ATTEMPTS,
  BASELINE_CONFIG,
  HISTORY_LIMITS,
  WEBRTC_CONSTANTS,
  MATH_CONSTANTS,
} from './constants'

// Factory functions for easy setup
export const createWebRTCStatsMonitor = (rtcPeer: any, connection: any) => {
  return new WebRTCStatsMonitor(rtcPeer, connection)
}

// Preset configurations
export const MONITORING_PRESETS = {
  strict: {
    name: 'strict' as const,
    description:
      'Aggressive monitoring with tight thresholds for critical applications',
    options: {
      enabled: true,
      interval: 500,
      verbose: true,
      thresholds: {
        packetLoss: 0.02,
        jitter: 15,
        rtt: 150,
        minBandwidth: 100,
        minAudioLevel: 0.1,
        minFrameRate: 25,
        maxFreezeCount: 2,
        maxFreezeDuration: 0.5,
      },
      autoRecover: true,
      maxRecoveryAttempts: 5,
      recoveryBackoff: 1.5,
      calculateBaseline: true,
      baselineDuration: 10000,
      enablePrediction: true,
      historySize: 100,
      adaptiveThresholds: true,
      adaptationRate: 0.1,
    },
  },
  balanced: {
    name: 'balanced' as const,
    description: 'Balanced monitoring suitable for most applications',
    options: {
      enabled: true,
      interval: 1000,
      verbose: false,
      autoRecover: true,
      maxRecoveryAttempts: 3,
      recoveryBackoff: 2.0,
      calculateBaseline: true,
      baselineDuration: 15000,
      enablePrediction: false,
      historySize: 50,
      adaptiveThresholds: false,
      adaptationRate: 0.05,
    },
  },
  relaxed: {
    name: 'relaxed' as const,
    description: 'Lenient monitoring for non-critical applications',
    options: {
      enabled: true,
      interval: 2000,
      verbose: false,
      thresholds: {
        packetLoss: 0.1,
        jitter: 50,
        rtt: 500,
        minBandwidth: 50,
        minAudioLevel: 0.05,
        minFrameRate: 10,
        maxFreezeCount: 10,
        maxFreezeDuration: 2.0,
      },
      autoRecover: false,
      maxRecoveryAttempts: 1,
      recoveryBackoff: 3.0,
      calculateBaseline: false,
      baselineDuration: 30000,
      enablePrediction: false,
      historySize: 20,
      adaptiveThresholds: false,
      adaptationRate: 0.02,
    },
  },
} as const

// Utility functions
export const QualityUtils = {
  /** Get quality level from numeric score */
  getQualityLevel: (score: number) => {
    if (score >= 90) return 'excellent' as const
    if (score >= 75) return 'good' as const
    if (score >= 60) return 'fair' as const
    if (score >= 40) return 'poor' as const
    return 'critical' as const
  },

  /** Get quality description */
  getQualityDescription: (level: NetworkQualityLevel) => {
    switch (level) {
      case 'excellent':
        return 'Connection quality is excellent with no issues detected'
      case 'good':
        return 'Connection quality is good with minor issues if any'
      case 'fair':
        return 'Connection quality is fair with some noticeable issues'
      case 'poor':
        return 'Connection quality is poor with significant issues'
      case 'critical':
        return 'Connection quality is critical with severe issues'
      default:
        return 'Connection quality is unknown'
    }
  },

  /** Get quality color for UI */
  getQualityColor: (level: NetworkQualityLevel) => {
    switch (level) {
      case 'excellent':
        return '#4CAF50' // Green
      case 'good':
        return '#8BC34A' // Light Green
      case 'fair':
        return '#FF9800' // Orange
      case 'poor':
        return '#FF5722' // Deep Orange
      case 'critical':
        return '#F44336' // Red
      default:
        return '#9E9E9E' // Grey
    }
  },
}

// Re-export examples for documentation (temporarily disabled)
// export * as examples from './WebRTCStatsMonitor.example'
