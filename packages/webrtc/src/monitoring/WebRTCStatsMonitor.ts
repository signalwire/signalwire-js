/**
 * WebRTC Stats Monitor - Core orchestration class for real-time connection monitoring
 *
 * This class coordinates all monitoring components and provides the main API for
 * WebRTC connection quality monitoring, issue detection, and automatic recovery.
 *
 * Features:
 * - Orchestrates BaselineManager, IssueDetector, RecoveryManager, and MetricsCollector
 * - Implements adaptive polling based on platform and network conditions
 * - Provides comprehensive event emission for application integration
 * - Manages monitoring lifecycle with proper cleanup
 * - Supports configurable monitoring options and thresholds
 * - Memory efficient with automatic history management
 */

import { getLogger } from '@signalwire/core'
import type RTCPeer from '../RTCPeer'
import type { BaseConnection } from '../BaseConnection'
import { BaselineManager } from './BaselineManager'
import { IssueDetector } from './IssueDetector'
import { RecoveryManager } from './RecoveryManager'
import { MetricsCollector } from './MetricsCollector'
import {
  IStatsMonitor,
  MonitoringOptions,
  MonitoringState,
  NetworkQuality,
  NetworkQualityLevel,
  StatsMetrics,
  ComputedMetrics,
  NetworkIssue,
  NetworkIssueType,
  RecoveryType,
  RecoveryAttemptInfo,
  StatsHistoryEntry,
  NetworkPrediction,
  MonitoringEvent,
  MonitoringEventHandler,
  Baseline,
  MonitoringPreset,
  SeverityUtils,
} from './interfaces'
import { POLLING_INTERVALS, HISTORY_LIMITS, BASELINE_CONFIG } from './constants'

/**
 * Default monitoring thresholds
 */
const DEFAULT_MONITORING_THRESHOLDS = {
  packetLoss: 0.05,
  jitter: 30,
  rtt: 200,
  minBandwidth: 100,
  minAudioLevel: 0.01,
  minFrameRate: 15,
  maxFreezeCount: 5,
  maxFreezeDuration: 1.0,
}

/**
 * Platform detection utilities
 */
const PlatformUtils = {
  /** Detect if running on mobile device */
  isMobile: (): boolean => {
    if (typeof window === 'undefined') return false
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      window.navigator.userAgent
    )
  },

  /** Get optimal polling interval based on platform and network state */
  getPollingInterval: (
    isMobile: boolean,
    hasIssues: boolean,
    isHealthy: boolean
  ): number => {
    if (hasIssues) {
      return isMobile
        ? POLLING_INTERVALS.MOBILE_ISSUES
        : POLLING_INTERVALS.DESKTOP_ISSUES
    }
    if (isHealthy) {
      return isMobile
        ? POLLING_INTERVALS.MOBILE_HEALTHY
        : POLLING_INTERVALS.DESKTOP_HEALTHY
    }
    return isMobile
      ? POLLING_INTERVALS.MOBILE_DEFAULT
      : POLLING_INTERVALS.DESKTOP_DEFAULT
  },
}

/**
 * Quality calculation utilities
 */
const QualityUtils = {
  /** Calculate network quality level from score */
  getQualityLevel: (score: number): NetworkQualityLevel => {
    if (score >= 90) return 'excellent'
    if (score >= 75) return 'good'
    if (score >= 60) return 'fair'
    if (score >= 40) return 'poor'
    return 'critical'
  },

  /** Calculate quality score from metrics and issues */
  calculateQualityScore: (
    metrics: StatsMetrics,
    issues: NetworkIssue[],
    baseline?: Baseline
  ): number => {
    let score = 100

    // Apply penalties for active issues
    for (const issue of issues) {
      if (!issue.active) continue

      switch (issue.type) {
        case NetworkIssueType.HIGH_PACKET_LOSS:
          score -= issue.severity * 30
          break
        case NetworkIssueType.HIGH_JITTER:
          score -= issue.severity * 20
          break
        case NetworkIssueType.HIGH_LATENCY:
          score -= issue.severity * 25
          break
        case NetworkIssueType.LOW_BANDWIDTH:
          score -= issue.severity * 15
          break
        case NetworkIssueType.CONNECTION_UNSTABLE:
          score -= issue.severity * 35
          break
        case NetworkIssueType.MEDIA_QUALITY_DEGRADED:
          score -= issue.severity * 25
          break
        case NetworkIssueType.ICE_CONNECTION_FAILED:
          score -= 50
          break
        case NetworkIssueType.ICE_CONNECTION_DISCONNECTED:
          score -= 40
          break
        default:
          score -= issue.severity * 10
      }
    }

    // Apply baseline-relative adjustments if available
    if (baseline) {
      const packetLossRatio =
        metrics.packetLoss / Math.max(baseline.packetLoss, 0.001)
      const jitterRatio = metrics.jitter / Math.max(baseline.jitter, 1)
      const rttRatio = metrics.rtt / Math.max(baseline.rtt, 1)

      if (packetLossRatio > 2) score -= 10
      if (jitterRatio > 2) score -= 8
      if (rttRatio > 2) score -= 12
    }

    return Math.max(0, Math.min(100, score))
  },
}

/**
 * Monitoring presets for common use cases
 */
const MONITORING_PRESETS: Record<string, MonitoringPreset> = {
  strict: {
    name: 'strict',
    description:
      'Aggressive monitoring with tight thresholds for critical applications',
    options: {
      enabled: true,
      interval: 500,
      verbose: true,
      thresholds: {
        packetLoss: 0.02, // 2%
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
    name: 'balanced',
    description: 'Balanced monitoring suitable for most applications',
    options: {
      enabled: true,
      interval: 1000,
      verbose: false,
      thresholds: DEFAULT_MONITORING_THRESHOLDS,
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
    name: 'relaxed',
    description: 'Lenient monitoring for non-critical applications',
    options: {
      enabled: true,
      interval: 2000,
      verbose: false,
      thresholds: {
        packetLoss: 0.1, // 10%
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
}

/**
 * Default monitoring options
 */
const DEFAULT_OPTIONS: MonitoringOptions = {
  enabled: true,
  interval: 1000,
  verbose: false,
  thresholds: DEFAULT_MONITORING_THRESHOLDS,
  autoRecover: true,
  maxRecoveryAttempts: 3,
  recoveryBackoff: 2.0,
  calculateBaseline: true,
  baselineDuration: BASELINE_CONFIG.BASELINE_WINDOW_MS,
  enablePrediction: false,
  historySize: HISTORY_LIMITS.METRICS_HISTORY_SIZE,
  adaptiveThresholds: false,
  adaptationRate: 0.05,
}

/**
 * Main WebRTC Stats Monitor class
 *
 * Orchestrates all monitoring components and provides the public API for
 * WebRTC connection quality monitoring and issue management.
 */
export class WebRTCStatsMonitor implements IStatsMonitor {
  private readonly logger = getLogger()
  private readonly rtcPeer: RTCPeer<any>

  // Core monitoring components
  private readonly metricsCollector: MetricsCollector
  private readonly issueDetector: IssueDetector
  private readonly recoveryManager: RecoveryManager
  private readonly baselineManager: BaselineManager

  // Monitoring state
  private options: MonitoringOptions = { ...DEFAULT_OPTIONS }
  private isActive = false
  private isPaused = false
  private currentQuality: NetworkQuality
  private activeIssues: Map<string, NetworkIssue> = new Map()
  private resolvedIssues: NetworkIssue[] = []
  private statsHistory: StatsHistoryEntry[] = []
  private recoveryAttempts: RecoveryAttemptInfo[] = []

  // Timing and intervals
  private pollingTimer?: NodeJS.Timeout
  private currentInterval = DEFAULT_OPTIONS.interval!
  private lastStatsTimestamp = 0
  private startTimestamp = 0

  // Platform detection
  private readonly isMobile = PlatformUtils.isMobile()

  // Event handlers map
  private readonly eventHandlers = new Map<
    string,
    Set<MonitoringEventHandler>
  >()

  constructor(rtcPeer: RTCPeer<any>, connection: BaseConnection<any>) {
    this.rtcPeer = rtcPeer

    // Initialize monitoring components
    this.metricsCollector = new MetricsCollector(
      (rtcPeer as any).peerConnection
    )
    this.issueDetector = new IssueDetector()
    this.recoveryManager = new RecoveryManager(rtcPeer, connection)
    this.baselineManager = new BaselineManager()

    // Initialize quality state
    this.currentQuality = this.createInitialQuality()

    // Set up component event handlers
    this.setupComponentEventHandlers()

    // Set up peer connection event handlers
    this.setupPeerConnectionHandlers()

    this.logger.debug('WebRTCStatsMonitor initialized', {
      isMobile: this.isMobile,
      defaultInterval: this.currentInterval,
    })
  }

  /**
   * Start monitoring with optional configuration
   */
  start(options?: MonitoringOptions): void {
    if (this.isActive) {
      this.logger.warn('Monitor already active, stopping previous session')
      this.stop()
    }

    // Merge options with defaults
    this.options = { ...DEFAULT_OPTIONS, ...options }

    // Validate options
    this.validateOptions(this.options)

    // Update component configurations
    this.updateComponentConfigurations()

    // Reset state
    this.resetState()

    // Start monitoring
    this.isActive = true
    this.startTimestamp = Date.now()

    // Start polling
    this.startPolling()

    // Emit start event
    this.emitEvent({
      type: 'monitoring.started',
      options: { ...this.options },
      timestamp: Date.now(),
    })

    this.logger.info('WebRTC monitoring started', {
      options: this.options,
      isMobile: this.isMobile,
    })
  }

  /**
   * Stop monitoring and cleanup resources
   */
  stop(): void {
    if (!this.isActive) {
      this.logger.debug('Monitor already stopped')
      return
    }

    this.isActive = false
    this.isPaused = false

    // Stop polling
    this.stopPolling()

    // Get final stats for the event
    const finalStats = this.statsHistory[this.statsHistory.length - 1]?.metrics

    // Emit stop event
    this.emitEvent({
      type: 'monitoring.stopped',
      reason: 'manual_stop',
      finalStats,
      timestamp: Date.now(),
    })

    this.logger.info('WebRTC monitoring stopped', {
      duration: Date.now() - this.startTimestamp,
      totalSamples: this.statsHistory.length,
      recoveryAttempts: this.recoveryAttempts.length,
    })
  }

  /**
   * Pause monitoring temporarily
   */
  pause(): void {
    if (!this.isActive || this.isPaused) return

    this.isPaused = true
    this.stopPolling()

    this.logger.debug('WebRTC monitoring paused')
  }

  /**
   * Resume paused monitoring
   */
  resume(): void {
    if (!this.isActive || !this.isPaused) return

    this.isPaused = false
    this.startPolling()

    this.logger.debug('WebRTC monitoring resumed')
  }

  /**
   * Get current monitoring state
   */
  getState(): MonitoringState {
    return {
      isActive: this.isActive,
      currentQuality: this.currentQuality,
      activeIssues: Array.from(this.activeIssues.values()),
      baseline: this.baselineManager.getBaseline() || undefined,
      history: [...this.statsHistory],
      recoveryAttempts: [...this.recoveryAttempts],
      lastStatsTimestamp: this.lastStatsTimestamp,
      startTimestamp: this.startTimestamp || undefined,
    }
  }

  /**
   * Get current network quality
   */
  getQuality(): NetworkQuality {
    return { ...this.currentQuality }
  }

  /**
   * Get statistics history with optional limit
   */
  getHistory(limit?: number): StatsHistoryEntry[] {
    const history = this.statsHistory
    return limit ? history.slice(-limit) : [...history]
  }

  /**
   * Force immediate stats collection
   */
  async collectNow(): Promise<StatsMetrics> {
    if (!this.isActive) {
      throw new Error('Monitor is not active')
    }

    try {
      return await this.collectStats()
    } catch (error) {
      this.logger.error('Failed to collect stats manually', { error })
      throw error
    }
  }

  /**
   * Update monitoring options
   */
  updateOptions(options: Partial<MonitoringOptions>): void {
    const previousOptions = { ...this.options }
    this.options = { ...this.options, ...options }

    this.validateOptions(this.options)
    this.updateComponentConfigurations()

    // Restart polling if interval changed
    if (options.interval && options.interval !== previousOptions.interval) {
      if (this.isActive && !this.isPaused) {
        this.stopPolling()
        this.startPolling()
      }
    }

    this.logger.debug('Monitoring options updated', {
      previousOptions,
      newOptions: this.options,
    })
  }

  /**
   * Apply monitoring preset
   */
  applyPreset(preset: keyof typeof MONITORING_PRESETS): void {
    const presetConfig = MONITORING_PRESETS[preset]
    if (!presetConfig) {
      throw new Error(`Unknown monitoring preset: ${preset}`)
    }

    this.updateOptions(presetConfig.options)

    this.logger.info(`Applied monitoring preset: ${preset}`, {
      description: presetConfig.description,
    })
  }

  /**
   * Get network predictions (if enabled)
   */
  getPrediction(horizon = 30000): NetworkPrediction | null {
    if (!this.options.enablePrediction || this.statsHistory.length < 10) {
      return null
    }

    try {
      return this.generatePrediction(horizon)
    } catch (error) {
      this.logger.error('Failed to generate prediction', { error })
      return null
    }
  }

  /**
   * Manually trigger recovery action
   */
  async triggerRecovery(type: RecoveryType): Promise<RecoveryAttemptInfo> {
    if (!this.isActive) {
      throw new Error('Monitor is not active')
    }

    try {
      const issues = Array.from(this.activeIssues.values())
      return await this.recoveryManager.attemptRecovery(issues)
    } catch (error) {
      this.logger.error('Manual recovery failed', { type, error })
      throw error
    }
  }

  /**
   * Subscribe to monitoring events
   */
  on<T extends MonitoringEvent>(
    event: T['type'],
    handler: MonitoringEventHandler<T>
  ): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler as MonitoringEventHandler)
  }

  /**
   * Unsubscribe from monitoring events
   */
  off<T extends MonitoringEvent>(
    event: T['type'],
    handler: MonitoringEventHandler<T>
  ): void {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.delete(handler as MonitoringEventHandler)
      if (handlers.size === 0) {
        this.eventHandlers.delete(event)
      }
    }
  }

  /**
   * Get network quality metrics summary
   */
  getNetworkQuality(): NetworkQuality {
    return this.getQuality()
  }

  /**
   * Get metrics history for analysis
   */
  getMetricsHistory(limit?: number): StatsHistoryEntry[] {
    return this.getHistory(limit)
  }

  /**
   * Configure monitoring with preset or custom options
   */
  configure(
    presetOrOptions: keyof typeof MONITORING_PRESETS | MonitoringOptions
  ): void {
    if (typeof presetOrOptions === 'string') {
      this.applyPreset(presetOrOptions)
    } else {
      this.updateOptions(presetOrOptions)
    }
  }

  /**
   * Dispose of the monitor and cleanup resources
   */
  dispose(): void {
    this.stop()

    // Clear event handlers
    this.eventHandlers.clear()

    // Clear history
    this.statsHistory = []
    this.recoveryAttempts = []
    this.activeIssues.clear()
    this.resolvedIssues = []

    this.logger.debug('WebRTCStatsMonitor disposed')
  }

  // Private methods

  /**
   * Create initial quality state
   */
  private createInitialQuality(): NetworkQuality {
    return {
      level: 'good',
      score: 80,
      issues: [],
      timestamp: Date.now(),
    }
  }

  /**
   * Setup event handlers for monitoring components
   */
  private setupComponentEventHandlers(): void {
    // Recovery manager events
    this.recoveryManager.on(
      'recovery.attempted',
      (attempt: RecoveryAttemptInfo) => {
        this.recoveryAttempts.push(attempt)

        // Emit recovery event
        this.emitEvent({
          type: 'network.recovery.attempted',
          attempt,
          quality: this.currentQuality,
          timestamp: Date.now(),
        })
      }
    )
  }

  /**
   * Setup RTCPeerConnection event handlers
   */
  private setupPeerConnectionHandlers(): void {
    // Listen for connection state changes
    const pc = (this.rtcPeer as any).peerConnection
    if (pc) {
      pc.addEventListener('connectionstatechange', () => {
        this.handleConnectionStateChange()
      })

      pc.addEventListener('iceconnectionstatechange', () => {
        this.handleIceConnectionStateChange()
      })
    }
  }

  /**
   * Handle peer connection state changes
   */
  private handleConnectionStateChange(): void {
    const pc = (this.rtcPeer as any).peerConnection
    if (!this.isActive || !pc) return

    const state = pc.connectionState

    if (state === 'failed' || state === 'disconnected') {
      // Adjust polling interval for connection issues
      this.updatePollingInterval(true, false)

      // Trigger connection issue detection
      this.detectConnectionIssues()
    } else if (state === 'connected') {
      // Connection restored, return to normal polling
      this.updatePollingInterval(false, true)
    }
  }

  /**
   * Handle ICE connection state changes
   */
  private handleIceConnectionStateChange(): void {
    const pc = (this.rtcPeer as any).peerConnection
    if (!this.isActive || !pc) return

    const state = pc.iceConnectionState

    if (state === 'failed' || state === 'disconnected') {
      this.detectConnectionIssues()
    }
  }

  /**
   * Detect connection-related issues
   */
  private detectConnectionIssues(): void {
    const pc = (this.rtcPeer as any).peerConnection
    if (!pc) return

    const now = Date.now()
    const connectionState = pc.connectionState
    const iceState = pc.iceConnectionState

    // Create connection issues based on states
    if (connectionState === 'failed') {
      const severity = 1.0
      const issue: NetworkIssue = {
        type: NetworkIssueType.ICE_CONNECTION_FAILED,
        severity,
        severityLevel: SeverityUtils.toSeverityLevel(severity),
        value: 1,
        threshold: 0,
        timestamp: now,
        active: true,
        description: 'WebRTC connection failed',
      }
      this.handleDetectedIssue(issue)
    }

    if (iceState === 'disconnected') {
      const severity = 0.8
      const issue: NetworkIssue = {
        type: NetworkIssueType.ICE_CONNECTION_DISCONNECTED,
        severity,
        severityLevel: SeverityUtils.toSeverityLevel(severity),
        value: 1,
        threshold: 0,
        timestamp: now,
        active: true,
        description: 'ICE connection disconnected',
      }
      this.handleDetectedIssue(issue)
    }
  }

  /**
   * Validate monitoring options
   */
  private validateOptions(options: MonitoringOptions): void {
    if (
      options.interval &&
      (options.interval < 100 || options.interval > 60000)
    ) {
      throw new Error('Monitoring interval must be between 100ms and 60s')
    }

    if (options.historySize && options.historySize < 1) {
      throw new Error('History size must be positive')
    }

    if (
      options.adaptationRate &&
      (options.adaptationRate < 0 || options.adaptationRate > 1)
    ) {
      throw new Error('Adaptation rate must be between 0 and 1')
    }
  }

  /**
   * Update component configurations based on current options
   */
  private updateComponentConfigurations(): void {
    // Update issue detector thresholds
    if (this.options.thresholds) {
      this.issueDetector.updateThresholds(this.options.thresholds)
    }

    // Update baseline manager options (assuming BaselineManager has these methods)
    // this.baselineManager.configure({
    //   enabled: this.options.calculateBaseline || false,
    //   collectionDuration: this.options.baselineDuration || BASELINE_CONFIG.BASELINE_WINDOW_MS,
    // })
  }

  /**
   * Reset monitoring state
   */
  private resetState(): void {
    this.statsHistory = []
    this.recoveryAttempts = []
    this.activeIssues.clear()
    this.resolvedIssues = []
    this.lastStatsTimestamp = 0
    this.currentQuality = this.createInitialQuality()
    this.currentInterval = this.options.interval || DEFAULT_OPTIONS.interval!
  }

  /**
   * Start polling for statistics
   */
  private startPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer)
    }

    this.pollingTimer = setInterval(() => {
      this.collectStatsAndProcess().catch((error) => {
        this.logger.error('Stats collection failed', { error })
      })
    }, this.currentInterval)

    this.logger.debug('Started polling', { interval: this.currentInterval })
  }

  /**
   * Stop polling
   */
  private stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer)
      this.pollingTimer = undefined
    }
  }

  /**
   * Main stats collection and processing pipeline
   */
  private async collectStatsAndProcess(): Promise<void> {
    if (!this.isActive || this.isPaused) return

    try {
      // Collect raw metrics
      const metrics = await this.collectStats()

      // Update timestamp
      this.lastStatsTimestamp = metrics.timestamp

      // Detect issues
      const detectedIssues = this.detectIssues(metrics)

      // Update network quality
      const previousQuality = { ...this.currentQuality }
      this.updateNetworkQuality(metrics, detectedIssues)

      // Compute derived metrics
      const computed = this.computeMetrics(metrics)

      // Add to history
      this.addToHistory(metrics, computed)

      // Handle recovery if needed
      if (this.options.autoRecover && detectedIssues.length > 0) {
        await this.attemptRecovery(detectedIssues)
      }

      // Update polling interval based on current conditions
      const hasActiveIssues = this.activeIssues.size > 0
      const isHealthy =
        this.currentQuality.level === 'excellent' ||
        this.currentQuality.level === 'good'
      this.updatePollingInterval(hasActiveIssues, isHealthy)

      // Emit events
      this.emitStatsCollected(metrics, computed)

      if (this.hasQualityChanged(previousQuality, this.currentQuality)) {
        this.emitQualityChanged(previousQuality)
      }
    } catch (error) {
      this.logger.error('Failed to collect and process stats', { error })
    }
  }

  /**
   * Collect statistics from metrics collector
   */
  private async collectStats(): Promise<StatsMetrics> {
    return await this.metricsCollector.collect()
  }

  /**
   * Detect issues from current metrics
   */
  private detectIssues(metrics: StatsMetrics): NetworkIssue[] {
    const thresholds = this.options.thresholds || DEFAULT_MONITORING_THRESHOLDS

    // Detect new issues
    const detectedIssues = this.issueDetector.detect(metrics, thresholds as any)

    // Process issue state changes
    const newIssues: NetworkIssue[] = []
    const resolvedIssues: NetworkIssue[] = []

    for (const issue of detectedIssues) {
      const issueKey = this.getIssueKey(issue)
      const existingIssue = this.activeIssues.get(issueKey)

      if (!existingIssue) {
        // New issue detected
        this.activeIssues.set(issueKey, issue)
        newIssues.push(issue)
        this.handleDetectedIssue(issue)
      } else {
        // Update existing issue
        existingIssue.severity = issue.severity
        existingIssue.severityLevel = issue.severityLevel
        existingIssue.value = issue.value
        existingIssue.timestamp = issue.timestamp
      }
    }

    // Check for resolved issues
    const currentIssueKeys = new Set(
      detectedIssues.map((i) => this.getIssueKey(i))
    )
    for (const [issueKey, issue] of this.activeIssues) {
      if (!currentIssueKeys.has(issueKey)) {
        issue.active = false
        resolvedIssues.push(issue)
        this.activeIssues.delete(issueKey)
        this.resolvedIssues.push(issue)
        this.handleResolvedIssue(issue)
      }
    }

    return detectedIssues
  }

  /**
   * Generate unique key for issue tracking
   */
  private getIssueKey(issue: NetworkIssue): string {
    return `${issue.type}-${issue.mediaType || 'all'}-${issue.trackId || 'all'}`
  }

  /**
   * Handle newly detected issue
   */
  private handleDetectedIssue(issue: NetworkIssue): void {
    this.emitEvent({
      type: 'network.issue.detected',
      issue,
      quality: this.currentQuality,
      timestamp: Date.now(),
    })

    if (this.options.verbose) {
      this.logger.warn('Network issue detected', {
        type: issue.type,
        severity: issue.severity,
        value: issue.value,
        threshold: issue.threshold,
        mediaType: issue.mediaType,
      })
    }
  }

  /**
   * Handle resolved issue
   */
  private handleResolvedIssue(issue: NetworkIssue): void {
    const duration = Date.now() - issue.timestamp

    this.emitEvent({
      type: 'network.issue.resolved',
      issue,
      duration,
      quality: this.currentQuality,
      timestamp: Date.now(),
    })

    if (this.options.verbose) {
      this.logger.info('Network issue resolved', {
        type: issue.type,
        duration,
        mediaType: issue.mediaType,
      })
    }
  }

  /**
   * Update network quality based on metrics and issues
   */
  private updateNetworkQuality(
    metrics: StatsMetrics,
    issues: NetworkIssue[]
  ): void {
    const baseline = this.baselineManager.getBaseline()
    const score = QualityUtils.calculateQualityScore(
      metrics,
      issues,
      baseline || undefined
    )
    const level = QualityUtils.getQualityLevel(score)

    this.currentQuality = {
      level,
      score,
      issues: issues.filter((i) => i.active),
      timestamp: Date.now(),
    }
  }

  /**
   * Compute derived metrics from raw stats
   */
  private computeMetrics(metrics: StatsMetrics): ComputedMetrics {
    const history = this.statsHistory.slice(-10) // Last 10 samples for trends

    return {
      packetLossRate: metrics.packetLoss,
      averageJitter: metrics.jitter,
      averageRtt: metrics.rtt,
      currentBandwidth: metrics.bandwidth,
      overallQualityScore: this.currentQuality.score,
      trends: this.calculateTrends(metrics, history),
      timestamp: metrics.timestamp,
    }
  }

  /**
   * Calculate metric trends
   */
  private calculateTrends(
    current: StatsMetrics,
    history: StatsHistoryEntry[]
  ): ComputedMetrics['trends'] {
    if (history.length < 3) {
      return {
        packetLoss: 'stable',
        jitter: 'stable',
        rtt: 'stable',
        bandwidth: 'stable',
      }
    }

    const getTrend = (
      currentValue: number,
      getValue: (entry: StatsHistoryEntry) => number
    ) => {
      const values = history.map(getValue)
      const avgPast = values.reduce((a, b) => a + b, 0) / values.length
      const change = (currentValue - avgPast) / avgPast

      if (change > 0.1) return 'degrading'
      if (change < -0.1) return 'improving'
      return 'stable'
    }

    return {
      packetLoss: getTrend(current.packetLoss, (e) => e.metrics.packetLoss),
      jitter: getTrend(current.jitter, (e) => e.metrics.jitter),
      rtt: getTrend(current.rtt, (e) => e.metrics.rtt),
      bandwidth: getTrend(current.bandwidth, (e) => e.metrics.bandwidth),
    }
  }

  /**
   * Add entry to stats history with cleanup
   */
  private addToHistory(metrics: StatsMetrics, computed: ComputedMetrics): void {
    const entry: StatsHistoryEntry = {
      metrics,
      computed,
      quality: { ...this.currentQuality },
      timestamp: metrics.timestamp,
    }

    this.statsHistory.push(entry)

    // Clean up old history
    const maxSize =
      this.options.historySize || HISTORY_LIMITS.METRICS_HISTORY_SIZE
    if (this.statsHistory.length > maxSize) {
      this.statsHistory = this.statsHistory.slice(-maxSize)
    }

    // Update baseline if enabled
    if (this.options.calculateBaseline) {
      this.baselineManager.addSample(metrics)
    }
  }

  /**
   * Attempt recovery for detected issues
   */
  private async attemptRecovery(issues: NetworkIssue[]): Promise<void> {
    if (issues.length === 0) return

    try {
      await this.recoveryManager.attemptRecovery(issues)
    } catch (error) {
      this.logger.error('Recovery attempt failed', {
        error,
        issues: issues.length,
      })
    }
  }

  /**
   * Update polling interval based on conditions
   */
  private updatePollingInterval(hasIssues: boolean, isHealthy: boolean): void {
    const newInterval = PlatformUtils.getPollingInterval(
      this.isMobile,
      hasIssues,
      isHealthy
    )

    if (newInterval !== this.currentInterval) {
      this.currentInterval = newInterval

      if (this.isActive && !this.isPaused) {
        this.stopPolling()
        this.startPolling()
      }

      this.logger.debug('Updated polling interval', {
        interval: newInterval,
        hasIssues,
        isHealthy,
        isMobile: this.isMobile,
      })
    }
  }

  /**
   * Check if network quality has changed significantly
   */
  private hasQualityChanged(
    previous: NetworkQuality,
    current: NetworkQuality
  ): boolean {
    return (
      previous.level !== current.level ||
      Math.abs(previous.score - current.score) >= 5 ||
      previous.issues.length !== current.issues.length
    )
  }

  /**
   * Generate network prediction
   */
  private generatePrediction(horizon: number): NetworkPrediction {
    const recentHistory = this.statsHistory.slice(-20)
    if (recentHistory.length < 10) {
      throw new Error('Insufficient history for prediction')
    }

    // Simple trend-based prediction
    const scores = recentHistory.map((h) => h.quality.score)
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
    const trend = scores.slice(-5).reduce((a, b) => a + b, 0) / 5 - avgScore

    const predictedScore = Math.max(0, Math.min(100, avgScore + trend))
    const predictedLevel = QualityUtils.getQualityLevel(predictedScore)

    return {
      predictedQuality: predictedLevel,
      confidence: Math.max(0.1, 1 - Math.abs(trend) / 50),
      horizon,
      predictedIssues: [],
      recommendations: [],
      timestamp: Date.now(),
    }
  }

  /**
   * Emit monitoring event to subscribers
   */
  private emitEvent(event: MonitoringEvent): void {
    const handlers = this.eventHandlers.get(event.type)
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event)
        } catch (error) {
          this.logger.error('Event handler error', { event: event.type, error })
        }
      })
    }

    // Event is already emitted through custom handlers above
  }

  /**
   * Emit stats collected event
   */
  private emitStatsCollected(
    metrics: StatsMetrics,
    computed: ComputedMetrics
  ): void {
    this.emitEvent({
      type: 'stats.collected',
      stats: metrics,
      computed,
      quality: this.currentQuality,
      timestamp: Date.now(),
    })
  }

  /**
   * Emit quality changed event
   */
  private emitQualityChanged(previousQuality: NetworkQuality): void {
    this.emitEvent({
      type: 'network.quality.changed',
      quality: this.currentQuality,
      previousQuality,
      timestamp: Date.now(),
    })
  }
}

export default WebRTCStatsMonitor
