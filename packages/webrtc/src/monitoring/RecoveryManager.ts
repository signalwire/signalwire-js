/**
 * WebRTC Recovery Manager
 *
 * Implements a three-tier recovery system for handling WebRTC connection issues:
 * - Tier 1 (Warning): Log issues, no active intervention
 * - Tier 2 (Recovery): Request keyframe, attempt media track recovery
 * - Tier 3 (ICE Restart): Full ICE restart and renegotiation
 */

import { getLogger } from '@signalwire/core'
import EventEmitter from 'eventemitter3'
import type RTCPeer from '../RTCPeer'
import type { BaseConnection } from '../BaseConnection'
import {
  NetworkIssue,
  NetworkIssueType,
  RecoveryType,
  RecoveryAttemptInfo,
  IRecoveryManager,
  StatsMetrics,
  SeverityUtils,
} from './interfaces'
import {
  RECOVERY_TIMING,
  MAX_RECOVERY_ATTEMPTS,
  getRecoveryTier,
} from './constants'

/**
 * Recovery action handler type
 */
type RecoveryActionHandler = (issues: NetworkIssue[]) => Promise<boolean>

/**
 * Recovery rate limiting information
 */
interface RecoveryRateLimit {
  lastAttempt: number
  attemptCount: number
  debounceMs: number
}

/**
 * Recovery Manager implementation for WebRTC connections
 */
export class RecoveryManager extends EventEmitter implements IRecoveryManager {
  private readonly logger = getLogger()
  private readonly rtcPeer: RTCPeer<any>
  private readonly connection: BaseConnection<any> // Used for emitting events

  /** History of all recovery attempts */
  private recoveryHistory: RecoveryAttemptInfo[] = []

  /** Rate limiting for different recovery types */
  private rateLimits = new Map<RecoveryType, RecoveryRateLimit>()

  /** Custom recovery strategy handlers */
  private strategyHandlers = new Map<RecoveryType, RecoveryActionHandler>()

  /** Current recovery operation promise */
  private currentRecovery: Promise<RecoveryAttemptInfo> | null = null

  /** Timestamp when attempts were last reset */
  private lastAttemptsReset = Date.now()

  constructor(rtcPeer: RTCPeer<any>, connection: BaseConnection<any>) {
    super()
    this.rtcPeer = rtcPeer
    this.connection = connection
    this.initializeRateLimits()
    this.registerDefaultStrategies()
    this.logger.debug('RecoveryManager initialized')
  }

  /**
   * Initialize rate limiting configurations for each recovery type
   */
  private initializeRateLimits(): void {
    this.rateLimits.set(RecoveryType.RESTART_ICE, {
      lastAttempt: 0,
      attemptCount: 0,
      debounceMs: RECOVERY_TIMING.ICE_RESTART_DEBOUNCE_MS,
    })

    this.rateLimits.set(RecoveryType.RENEGOTIATE, {
      lastAttempt: 0,
      attemptCount: 0,
      debounceMs: RECOVERY_TIMING.RENEGOTIATION_DEBOUNCE_MS,
    })

    this.rateLimits.set(RecoveryType.TOGGLE_TRACKS, {
      lastAttempt: 0,
      attemptCount: 0,
      debounceMs: RECOVERY_TIMING.KEYFRAME_DEBOUNCE_MS,
    })

    this.rateLimits.set(RecoveryType.REDUCE_QUALITY, {
      lastAttempt: 0,
      attemptCount: 0,
      debounceMs: RECOVERY_TIMING.RECOVERY_DEBOUNCE_MS,
    })

    this.rateLimits.set(RecoveryType.NONE, {
      lastAttempt: 0,
      attemptCount: 0,
      debounceMs: RECOVERY_TIMING.RECOVERY_DEBOUNCE_MS,
    })
  }

  /**
   * Register default recovery strategy handlers
   */
  private registerDefaultStrategies(): void {
    this.strategyHandlers.set(
      RecoveryType.RESTART_ICE,
      this.handleIceRestart.bind(this)
    )
    this.strategyHandlers.set(
      RecoveryType.RENEGOTIATE,
      this.handleRenegotiation.bind(this)
    )
    this.strategyHandlers.set(
      RecoveryType.TOGGLE_TRACKS,
      this.handleKeyframeRequest.bind(this)
    )
    this.strategyHandlers.set(
      RecoveryType.REDUCE_QUALITY,
      this.handleQualityReduction.bind(this)
    )
    this.strategyHandlers.set(
      RecoveryType.RECONNECT,
      this.handleReconnect.bind(this)
    )
    this.strategyHandlers.set(
      RecoveryType.NONE,
      this.handleNoRecovery.bind(this)
    )
  }

  /**
   * Attempt recovery based on detected network issues
   */
  async attemptRecovery(issues: NetworkIssue[]): Promise<RecoveryAttemptInfo> {
    // If already performing recovery, return the current operation
    if (this.currentRecovery) {
      this.logger.debug('Recovery already in progress, waiting for completion')
      return this.currentRecovery
    }

    const activeIssues = issues.filter((issue) => issue.active)
    if (activeIssues.length === 0) {
      this.logger.debug('No active issues to recover from')
      return this.createRecoveryAttempt(
        RecoveryType.NONE,
        true,
        0,
        activeIssues
      )
    }

    this.logger.info(
      'Attempting recovery for issues:',
      activeIssues.map((i) => i.type)
    )

    // Determine recovery tier based on issues
    const recoveryTier = this.determineRecoveryTier(activeIssues)
    const recoveryType = this.selectRecoveryType(recoveryTier, activeIssues)

    // Check if recovery is allowed
    if (!this.canAttemptRecovery(recoveryType)) {
      this.logger.warn(`Recovery attempt blocked for type ${recoveryType}`)
      return this.createRecoveryAttempt(
        recoveryType,
        false,
        0,
        activeIssues,
        new Error('Recovery attempt rate limited or max attempts exceeded')
      )
    }

    // Start recovery operation
    this.currentRecovery = this.executeRecoveryOperation(
      recoveryType,
      activeIssues
    )

    try {
      const result = await this.currentRecovery
      this.logger.info(
        `Recovery ${
          result.success ? 'succeeded' : 'failed'
        } for type ${recoveryType}`
      )
      return result
    } finally {
      this.currentRecovery = null
    }
  }

  /**
   * Execute the actual recovery operation
   */
  private async executeRecoveryOperation(
    recoveryType: RecoveryType,
    issues: NetworkIssue[]
  ): Promise<RecoveryAttemptInfo> {
    const startTime = Date.now()
    let success = false
    let error: Error | undefined

    try {
      // Record attempt before execution
      this.recordRecoveryAttempt(recoveryType)

      // Execute recovery action
      success = await this.executeRecoveryAction(recoveryType, issues)

      // If successful, reset attempt counters for this type
      if (success) {
        this.resetAttemptsForType(recoveryType)
      }
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err))
      this.logger.error(
        `Recovery action failed for type ${recoveryType}:`,
        error
      )
    }

    const duration = Date.now() - startTime

    const attemptInfo: RecoveryAttemptInfo = {
      type: recoveryType,
      success,
      timestamp: startTime,
      duration,
      error,
      metricsBefore: this.getDefaultMetrics(),
      triggeredBy: issues,
    }

    // Add to history
    this.addToHistory(attemptInfo)

    // Emit recovery event
    this.emit('recovery.attempted', {
      type: 'network.recovery.attempted',
      attempt: attemptInfo,
      quality: { level: 'poor', score: 0, issues, timestamp: Date.now() },
      timestamp: Date.now(),
    })

    // Also emit on the connection for upstream handling
    this.connection.emit('network.recovery.attempted', attemptInfo)

    return attemptInfo
  }

  /**
   * Execute specific recovery action based on type
   */
  async executeRecoveryAction(
    recoveryType: RecoveryType,
    issues: NetworkIssue[]
  ): Promise<boolean> {
    const handler = this.strategyHandlers.get(recoveryType)
    if (!handler) {
      this.logger.warn(
        `No strategy handler found for recovery type: ${recoveryType}`
      )
      return false
    }

    this.logger.debug(`Executing recovery action: ${recoveryType}`)
    return handler(issues)
  }

  /**
   * Check if recovery attempt is allowed based on rate limiting and max attempts
   */
  canAttemptRecovery(recoveryType: RecoveryType): boolean {
    // Reset attempts if enough time has passed
    this.resetAttemptsIfExpired()

    const rateLimit = this.rateLimits.get(recoveryType)
    if (!rateLimit) {
      return false
    }

    const now = Date.now()

    // Check debounce period
    if (now - rateLimit.lastAttempt < rateLimit.debounceMs) {
      this.logger.debug(`Recovery type ${recoveryType} is in debounce period`)
      return false
    }

    // Check max attempts per type
    const maxAttempts = this.getMaxAttemptsForType(recoveryType)
    if (rateLimit.attemptCount >= maxAttempts) {
      this.logger.debug(
        `Recovery type ${recoveryType} has exceeded max attempts (${maxAttempts})`
      )
      return false
    }

    // Check total attempts across all types
    const totalAttempts = Array.from(this.rateLimits.values()).reduce(
      (sum, limit) => sum + limit.attemptCount,
      0
    )

    if (totalAttempts >= MAX_RECOVERY_ATTEMPTS.TOTAL_ATTEMPTS) {
      this.logger.debug(
        `Total recovery attempts exceeded (${MAX_RECOVERY_ATTEMPTS.TOTAL_ATTEMPTS})`
      )
      return false
    }

    return true
  }

  /**
   * Record a recovery attempt for rate limiting
   */
  recordRecoveryAttempt(recoveryType: RecoveryType): void {
    const rateLimit = this.rateLimits.get(recoveryType)
    if (rateLimit) {
      rateLimit.lastAttempt = Date.now()
      rateLimit.attemptCount++
      this.logger.debug(
        `Recorded recovery attempt for ${recoveryType}, count: ${rateLimit.attemptCount}`
      )
    }
  }

  /**
   * Register a custom recovery strategy handler
   */
  registerStrategy(type: RecoveryType, handler: RecoveryActionHandler): void {
    this.strategyHandlers.set(type, handler)
    this.logger.debug(`Registered custom strategy for recovery type: ${type}`)
  }

  /**
   * Get recovery attempt history
   */
  getHistory(): RecoveryAttemptInfo[] {
    return [...this.recoveryHistory]
  }

  /**
   * Clear recovery history and reset attempt counters
   */
  reset(): void {
    this.recoveryHistory = []
    this.rateLimits.forEach((limit) => {
      limit.attemptCount = 0
      limit.lastAttempt = 0
    })
    this.lastAttemptsReset = Date.now()
    this.logger.debug('Recovery manager reset')
  }

  /**
   * Handle manual recovery trigger
   */
  async triggerManualRecovery(
    type: RecoveryType
  ): Promise<RecoveryAttemptInfo> {
    this.logger.info(`Manual recovery triggered for type: ${type}`)

    // Create a synthetic issue for manual recovery
    const severity = 0.8
    const manualIssue: NetworkIssue = {
      type: NetworkIssueType.CONNECTION_UNSTABLE,
      severity,
      severityLevel: SeverityUtils.toSeverityLevel(severity),
      value: 1,
      threshold: 0,
      timestamp: Date.now(),
      active: true,
      description: 'Manual recovery triggered',
    }

    // For manual recovery, bypass tier detection and force the specific type
    return this.executeRecoveryOperation(type, [manualIssue])
  }

  // === Private Helper Methods ===

  /**
   * Determine recovery tier based on active issues
   */
  private determineRecoveryTier(issues: NetworkIssue[]): 1 | 2 | 3 {
    const criticalIssues = issues.filter((issue) =>
      SeverityUtils.isCritical(issue.severityLevel || issue.severity)
    )
    const warningIssues = issues.filter((issue) =>
      SeverityUtils.isWarning(issue.severityLevel || issue.severity)
    )

    // Special case: ICE connection failures always trigger Tier 3 (ICE restart)
    const hasIceFailure = issues.some(
      (issue) =>
        issue.type === NetworkIssueType.ICE_CONNECTION_FAILED ||
        issue.type === NetworkIssueType.ICE_CONNECTION_DISCONNECTED
    )

    if (hasIceFailure && criticalIssues.length > 0) {
      return 3
    }

    return getRecoveryTier(warningIssues.length, criticalIssues.length)
  }

  /**
   * Select appropriate recovery type based on tier and issues
   */
  private selectRecoveryType(
    tier: 1 | 2 | 3,
    issues: NetworkIssue[]
  ): RecoveryType {
    switch (tier) {
      case 1:
        // Tier 1: Warning level - no active recovery
        return RecoveryType.NONE

      case 2:
        // Tier 2: Recovery level - keyframe or media recovery
        if (issues.some((issue) => issue.mediaType === 'video')) {
          return RecoveryType.TOGGLE_TRACKS // Keyframe request equivalent
        }
        return RecoveryType.REDUCE_QUALITY

      case 3:
        // Tier 3: ICE restart level
        if (
          issues.some(
            (issue) =>
              issue.type === NetworkIssueType.ICE_CONNECTION_FAILED ||
              issue.type === NetworkIssueType.ICE_CONNECTION_DISCONNECTED
          )
        ) {
          return RecoveryType.RESTART_ICE
        }
        // For CONNECTION_UNSTABLE, use renegotiation
        if (
          issues.some(
            (issue) => issue.type === NetworkIssueType.CONNECTION_UNSTABLE
          )
        ) {
          return RecoveryType.RENEGOTIATE
        }
        return RecoveryType.RENEGOTIATE

      default:
        return RecoveryType.NONE
    }
  }

  /**
   * Get maximum attempts allowed for a recovery type
   */
  private getMaxAttemptsForType(recoveryType: RecoveryType): number {
    switch (recoveryType) {
      case RecoveryType.TOGGLE_TRACKS:
        return MAX_RECOVERY_ATTEMPTS.KEYFRAME_REQUESTS
      case RecoveryType.RESTART_ICE:
        return MAX_RECOVERY_ATTEMPTS.ICE_RESTARTS
      case RecoveryType.RENEGOTIATE:
        return MAX_RECOVERY_ATTEMPTS.RENEGOTIATIONS
      default:
        return MAX_RECOVERY_ATTEMPTS.TOTAL_ATTEMPTS
    }
  }

  /**
   * Reset attempt counters if enough time has passed
   */
  private resetAttemptsIfExpired(): void {
    const now = Date.now()
    if (
      now - this.lastAttemptsReset >
      MAX_RECOVERY_ATTEMPTS.RESET_ATTEMPTS_AFTER_MS
    ) {
      this.rateLimits.forEach((limit) => {
        limit.attemptCount = 0
      })
      this.lastAttemptsReset = now
      this.logger.debug('Recovery attempt counters reset due to timeout')
    }
  }

  /**
   * Reset attempt counter for a specific recovery type
   */
  private resetAttemptsForType(recoveryType: RecoveryType): void {
    const rateLimit = this.rateLimits.get(recoveryType)
    if (rateLimit) {
      rateLimit.attemptCount = 0
      this.logger.debug(
        `Reset attempt counter for recovery type: ${recoveryType}`
      )
    }
  }

  /**
   * Add recovery attempt to history with size limits
   */
  private addToHistory(attempt: RecoveryAttemptInfo): void {
    this.recoveryHistory.push(attempt)

    // Limit history size
    const maxHistory = 50
    if (this.recoveryHistory.length > maxHistory) {
      this.recoveryHistory = this.recoveryHistory.slice(-maxHistory)
    }
  }

  /**
   * Create a recovery attempt info object
   */
  private createRecoveryAttempt(
    type: RecoveryType,
    success: boolean,
    duration: number,
    issues: NetworkIssue[],
    error?: Error
  ): RecoveryAttemptInfo {
    const attempt: RecoveryAttemptInfo = {
      type,
      success,
      timestamp: Date.now(),
      duration,
      error,
      metricsBefore: this.getDefaultMetrics(),
      triggeredBy: issues,
    }

    this.addToHistory(attempt)
    return attempt
  }

  // === Recovery Action Handlers ===

  /**
   * Handle ICE restart recovery
   */
  private async handleIceRestart(_issues: NetworkIssue[]): Promise<boolean> {
    this.logger.info('Executing ICE restart recovery')

    if (!this.rtcPeer || !this.rtcPeer.instance) {
      throw new Error('RTCPeer instance not available')
    }

    // Check if we can restart ICE
    if (this.rtcPeer.isNegotiating) {
      this.logger.warn('Cannot restart ICE during active negotiation')
      return false
    }

    try {
      // Perform ICE restart
      this.rtcPeer.restartIce()
      this.logger.info('ICE restart initiated successfully')
      return true
    } catch (error) {
      this.logger.error('ICE restart failed:', error)
      throw error // Re-throw to allow error to be captured in recovery attempt
    }
  }

  /**
   * Handle renegotiation recovery (reinvite)
   */
  private async handleRenegotiation(_issues: NetworkIssue[]): Promise<boolean> {
    try {
      this.logger.info('Executing renegotiation recovery (reinvite)')

      if (!this.rtcPeer || !this.rtcPeer.instance) {
        throw new Error('RTCPeer instance not available')
      }

      if (this.rtcPeer.isNegotiating) {
        this.logger.warn('Cannot renegotiate during active negotiation')
        return false
      }

      // Use the new triggerReinvite method for full renegotiation
      await this.rtcPeer.triggerReinvite()

      this.logger.info('Renegotiation (reinvite) initiated successfully')
      return true
    } catch (error) {
      this.logger.error('Renegotiation (reinvite) failed:', error)
      throw error // Re-throw to allow error to be captured in recovery attempt
    }
  }

  /**
   * Handle keyframe request recovery
   */
  private async handleKeyframeRequest(
    issues: NetworkIssue[]
  ): Promise<boolean> {
    this.logger.info('Executing keyframe request recovery')

    if (!this.rtcPeer) {
      throw new Error('RTCPeer instance not available')
    }

    try {
      // For video issues, use the improved RTCPeer keyframe request method
      const videoIssues = issues.filter((issue) => issue.mediaType === 'video')

      if (videoIssues.length > 0) {
        this.logger.debug(
          `Handling ${videoIssues.length} video issues with keyframe request`
        )
        await this.rtcPeer.requestKeyframe()
      }

      // For audio issues, try to restore audio tracks
      const audioIssues = issues.filter((issue) => issue.mediaType === 'audio')
      if (audioIssues.length > 0) {
        this.logger.debug(
          `Handling ${audioIssues.length} audio issues with track restoration`
        )
        await this.restoreAudioTrack()
      }

      // If no specific media issues, try keyframe request anyway as a general recovery
      if (videoIssues.length === 0 && audioIssues.length === 0) {
        this.logger.debug(
          'No specific media issues detected, attempting keyframe request as general recovery'
        )
        await this.rtcPeer.requestKeyframe()
      }

      this.logger.info('Keyframe request recovery completed successfully')
      return true
    } catch (error) {
      this.logger.error('Keyframe request recovery failed:', error)
      throw error // Re-throw to allow error to be captured in recovery attempt
    }
  }

  /**
   * Handle quality reduction recovery
   */
  private async handleQualityReduction(
    issues: NetworkIssue[]
  ): Promise<boolean> {
    try {
      this.logger.info('Executing quality reduction recovery')

      if (!this.rtcPeer) {
        throw new Error('RTCPeer instance not available')
      }

      // Reduce video quality if video issues are present
      const videoIssues = issues.filter((issue) => issue.mediaType === 'video')
      if (videoIssues.length > 0) {
        await this.reduceVideoQuality()
      }

      this.logger.info('Quality reduction completed')
      return true
    } catch (error) {
      this.logger.error('Quality reduction failed:', error)
      return false
    }
  }

  /**
   * Handle reconnect recovery
   */
  private async handleReconnect(_issues: NetworkIssue[]): Promise<boolean> {
    try {
      this.logger.info('Executing reconnect recovery')

      // Trigger resume logic which handles reconnection
      this.rtcPeer.triggerResume()

      this.logger.info('Reconnect recovery initiated')
      return true
    } catch (error) {
      this.logger.error('Reconnect recovery failed:', error)
      return false
    }
  }

  /**
   * Handle no recovery action (tier 1 - warning level)
   */
  private async handleNoRecovery(issues: NetworkIssue[]): Promise<boolean> {
    this.logger.info('No recovery action taken (tier 1 - warning level only)')
    this.logger.debug(
      'Issues detected but below recovery threshold:',
      issues.map((i) => i.type)
    )
    return true // Always successful since no action is taken
  }

  // === Utility Methods ===

  // Note: requestVideoKeyframe() method removed - now using RTCPeer.requestKeyframe() directly

  /**
   * Restore audio track
   */
  private async restoreAudioTrack(): Promise<void> {
    try {
      await this.rtcPeer.restoreTrackSender('audio')
    } catch (error) {
      this.logger.warn('Failed to restore audio track:', error)
    }
  }

  /**
   * Reduce video quality
   */
  private async reduceVideoQuality(): Promise<void> {
    try {
      // Apply lower quality constraints
      await this.rtcPeer.applyMediaConstraints('video', {
        width: { ideal: 320 },
        height: { ideal: 240 },
        frameRate: { ideal: 15 },
      })
    } catch (error) {
      this.logger.warn('Failed to reduce video quality:', error)
    }
  }

  /**
   * Get default metrics structure
   */
  private getDefaultMetrics(): StatsMetrics {
    return {
      packetLoss: 0,
      jitter: 0,
      rtt: 0,
      bandwidth: 0,
      packetsSent: 0,
      packetsReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
      timestamp: Date.now(),
    }
  }
}

export default RecoveryManager
