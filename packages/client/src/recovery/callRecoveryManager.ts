/**
 * Call Recovery Manager
 * 
 * Manages automatic call recovery for SignalWire sessions when network issues
 * or connection problems are detected. Provides intelligent recovery strategies
 * with debouncing, retry limits, and exponential backoff.
 * 
 * Based on Cantina application improvements for enhanced call reliability.
 */

import { getLogger } from '@signalwire/core'
import { NetworkIssue, NetworkIssueType } from '@signalwire/webrtc'
import { ReinviteEngine, ReinviteConfig } from './reinviteEngine'
import { NetworkIssueDetector, NetworkIssueDetectorConfig } from './networkIssueDetector'

export interface CallRecoveryConfig {
  enabled: boolean
  maxAttempts: number
  debounceTime: number // milliseconds
  exponentialBackoff: boolean
  triggers: CallRecoveryTrigger[]
  reinviteConfig?: Partial<ReinviteConfig>
  detectorConfig?: Partial<NetworkIssueDetectorConfig>
}

export type CallRecoveryTrigger = 
  | 'audio_timeout'
  | 'ice_failed' 
  | 'no_packets'
  | 'high_packet_loss'
  | 'connection_failed'
  | 'dtls_failed'

export interface CallRecoveryAttempt {
  attemptNumber: number
  timestamp: number
  trigger: CallRecoveryTrigger | NetworkIssueType
  success?: boolean
  error?: string
  duration?: number
}

export interface CallRecoveryState {
  isRecovering: boolean
  attemptCount: number
  lastAttempt?: CallRecoveryAttempt
  attempts: CallRecoveryAttempt[]
  nextAttemptTime?: number
  disabled: boolean
}

export interface CallRecoveryEvents {
  'recovery.attempting': (attempt: CallRecoveryAttempt) => void
  'recovery.succeeded': (attempt: CallRecoveryAttempt) => void
  'recovery.failed': (attempt: CallRecoveryAttempt, finalFailure: boolean) => void
  'recovery.disabled': (reason: string) => void
  'recovery.enabled': () => void
}

const DEFAULT_CONFIG: CallRecoveryConfig = {
  enabled: true,
  maxAttempts: 3,
  debounceTime: 10000, // 10 seconds
  exponentialBackoff: true,
  triggers: ['ice_failed', 'no_packets', 'connection_failed']
}

export class CallRecoveryManager {
  private config: CallRecoveryConfig
  private state: CallRecoveryState = {
    isRecovering: false,
    attemptCount: 0,
    attempts: [],
    disabled: false
  }
  
  private reinviteEngine: ReinviteEngine
  private networkDetector: NetworkIssueDetector
  private eventListeners: Map<keyof CallRecoveryEvents, Set<Function>> = new Map()
  private recoveryTimeout?: NodeJS.Timeout
  private logger = getLogger()

  constructor(
    config: Partial<CallRecoveryConfig> = {},
    private recoveryCallback: () => Promise<void>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    
    // Initialize reinvite engine
    this.reinviteEngine = new ReinviteEngine({
      ...this.config.reinviteConfig,
      maxAttempts: this.config.maxAttempts,
      debounceTime: this.config.debounceTime
    })
    
    // Initialize network issue detector
    this.networkDetector = new NetworkIssueDetector({
      ...this.config.detectorConfig,
      triggers: this.config.triggers
    })
    
    this.setupEventListeners()
    this.logger.debug('CallRecoveryManager initialized', this.config)
  }

  /**
   * Start monitoring for recovery triggers
   */
  public startMonitoring(): void {
    if (!this.config.enabled) {
      this.logger.debug('Call recovery is disabled')
      return
    }
    
    this.state.disabled = false
    this.networkDetector.startMonitoring()
    this.emit('recovery.enabled')
    this.logger.info('Call recovery monitoring started')
  }

  /**
   * Stop monitoring and clear any pending recovery
   */
  public stopMonitoring(): void {
    this.networkDetector.stopMonitoring()
    this.reinviteEngine.stop()
    
    if (this.recoveryTimeout) {
      clearTimeout(this.recoveryTimeout)
      this.recoveryTimeout = undefined
    }
    
    this.state.isRecovering = false
    this.logger.info('Call recovery monitoring stopped')
  }

  /**
   * Manually trigger recovery attempt
   */
  public async triggerRecovery(trigger: CallRecoveryTrigger): Promise<boolean> {
    if (this.state.disabled || !this.config.enabled) {
      this.logger.warn('Recovery attempt ignored - recovery is disabled')
      return false
    }

    return this.attemptRecovery(trigger)
  }

  /**
   * Disable recovery temporarily or permanently
   */
  public disableRecovery(reason: string): void {
    this.state.disabled = true
    this.stopMonitoring()
    this.emit('recovery.disabled', reason)
    this.logger.info(`Call recovery disabled: ${reason}`)
  }

  /**
   * Re-enable recovery
   */
  public enableRecovery(): void {
    this.state.disabled = false
    this.startMonitoring()
    this.logger.info('Call recovery re-enabled')
  }

  /**
   * Get current recovery state
   */
  public getState(): CallRecoveryState {
    return { ...this.state }
  }

  /**
   * Get recovery configuration  
   */
  public getConfig(): CallRecoveryConfig {
    return { ...this.config }
  }

  /**
   * Update recovery configuration
   */
  public updateConfig(newConfig: Partial<CallRecoveryConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Update dependent components
    this.reinviteEngine.updateConfig({
      maxAttempts: this.config.maxAttempts,
      debounceTime: this.config.debounceTime
    })
    
    this.networkDetector.updateConfig({
      triggers: this.config.triggers
    })
    
    this.logger.debug('Call recovery configuration updated', this.config)
  }

  /**
   * Add event listener
   */
  public on<K extends keyof CallRecoveryEvents>(
    event: K,
    listener: CallRecoveryEvents[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(listener)
  }

  /**
   * Remove event listener
   */
  public off<K extends keyof CallRecoveryEvents>(
    event: K,
    listener: CallRecoveryEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  private setupEventListeners(): void {
    // Listen for network issues that should trigger recovery
    this.networkDetector.on('issue.detected', (issue) => {
      const trigger = this.mapNetworkIssueToTrigger(issue.type)
      if (trigger && this.shouldTriggerRecovery(trigger)) {
        this.logger.debug(`Network issue detected, triggering recovery: ${issue.type}`)
        this.attemptRecovery(trigger)
      }
    })

    // Listen for reinvite engine events 
    this.reinviteEngine.on('reinvite.attempting', (attempt) => {
      this.logger.debug(`Reinvite attempt ${attempt.attemptNumber}`)
    })
    
    this.reinviteEngine.on('reinvite.succeeded', () => {
      this.handleRecoverySuccess()
    })
    
    this.reinviteEngine.on('reinvite.failed', (finalFailure) => {
      this.handleRecoveryFailure(finalFailure)
    })
  }

  private mapNetworkIssueToTrigger(issueType: NetworkIssueType): CallRecoveryTrigger | null {
    const mapping: Record<NetworkIssueType, CallRecoveryTrigger> = {
      [NetworkIssueType.NO_INBOUND_PACKETS]: 'no_packets',
      [NetworkIssueType.HIGH_PACKET_LOSS]: 'high_packet_loss', 
      [NetworkIssueType.ICE_DISCONNECTED]: 'ice_failed',
      [NetworkIssueType.CONNECTION_FAILED]: 'connection_failed',
      [NetworkIssueType.DTLS_FAILED]: 'dtls_failed',
      [NetworkIssueType.HIGH_RTT]: 'no_packets', // Map to no_packets as similar issue
      [NetworkIssueType.HIGH_JITTER]: 'no_packets' // Map to no_packets as similar issue
    }
    
    return mapping[issueType] || null
  }

  private shouldTriggerRecovery(trigger: CallRecoveryTrigger): boolean {
    // Check if this trigger is enabled
    if (!this.config.triggers.includes(trigger)) {
      return false
    }
    
    // Check if we're already recovering
    if (this.state.isRecovering) {
      this.logger.debug(`Recovery already in progress, ignoring trigger: ${trigger}`)
      return false
    }
    
    // Check if we've exceeded max attempts
    if (this.state.attemptCount >= this.config.maxAttempts) {
      this.logger.warn(`Max recovery attempts (${this.config.maxAttempts}) exceeded`)
      this.disableRecovery('Max attempts exceeded')
      return false
    }

    // Check debounce time
    const now = Date.now()
    if (this.state.lastAttempt && (now - this.state.lastAttempt.timestamp) < this.config.debounceTime) {
      this.logger.debug(`Recovery debounced, ignoring trigger: ${trigger}`)
      return false
    }
    
    return true
  }

  private async attemptRecovery(trigger: CallRecoveryTrigger): Promise<boolean> {
    if (!this.shouldTriggerRecovery(trigger)) {
      return false
    }

    this.state.isRecovering = true
    this.state.attemptCount++
    
    const attempt: CallRecoveryAttempt = {
      attemptNumber: this.state.attemptCount,
      timestamp: Date.now(),
      trigger
    }
    
    this.state.lastAttempt = attempt
    this.state.attempts.push(attempt)
    this.emit('recovery.attempting', attempt)
    
    try {
      // Calculate delay for exponential backoff
      const delay = this.calculateBackoffDelay(this.state.attemptCount)
      if (delay > 0) {
        this.logger.debug(`Delaying recovery attempt by ${delay}ms`)
        await this.sleep(delay)
      }
      
      const startTime = Date.now()
      
      // Attempt recovery using reinvite engine
      const success = await this.reinviteEngine.attempt(this.recoveryCallback)
      
      attempt.duration = Date.now() - startTime
      attempt.success = success
      
      if (success) {
        this.handleRecoverySuccess()
        return true
      } else {
        this.handleRecoveryFailure(this.state.attemptCount >= this.config.maxAttempts)
        return false
      }
    } catch (error) {
      attempt.error = error instanceof Error ? error.message : String(error)
      attempt.success = false
      this.handleRecoveryFailure(this.state.attemptCount >= this.config.maxAttempts)
      return false
    }
  }

  private calculateBackoffDelay(attemptNumber: number): number {
    if (!this.config.exponentialBackoff) {
      return 0
    }
    
    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    return Math.min(1000 * Math.pow(2, attemptNumber - 1), 30000) // Cap at 30 seconds
  }

  private handleRecoverySuccess(): void {
    this.logger.info(`Call recovery succeeded after ${this.state.attemptCount} attempt(s)`)
    
    if (this.state.lastAttempt) {
      this.state.lastAttempt.success = true
      this.emit('recovery.succeeded', this.state.lastAttempt)
    }
    
    // Reset state
    this.state.isRecovering = false
    this.state.attemptCount = 0
  }

  private handleRecoveryFailure(isFinalFailure: boolean): void {
    this.logger.warn(`Call recovery attempt failed. Final failure: ${isFinalFailure}`)
    
    if (this.state.lastAttempt) {
      this.emit('recovery.failed', this.state.lastAttempt, isFinalFailure)
    }
    
    this.state.isRecovering = false
    
    if (isFinalFailure) {
      this.disableRecovery('All recovery attempts failed')
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private emit<K extends keyof CallRecoveryEvents>(
    event: K,
    ...args: Parameters<CallRecoveryEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as any)(...args)
        } catch (error) {
          this.logger.error(`Error in recovery event listener for ${event}:`, error)
        }
      })
    }
  }

  /**
   * Cleanup and stop all recovery operations
   */
  public destroy(): void {
    this.stopMonitoring()
    this.eventListeners.clear()
    this.reinviteEngine.destroy()
    this.networkDetector.destroy()
    this.logger.debug('CallRecoveryManager destroyed')
  }
}