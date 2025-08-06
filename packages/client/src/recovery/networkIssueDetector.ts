/**
 * Network Issue Detector
 * 
 * Integrates with WebRTC monitoring to detect network issues that should
 * trigger call recovery. Provides filtering, aggregation, and event emission
 * for recovery-relevant network problems.
 * 
 * Based on Cantina application network monitoring patterns.
 */

import { getLogger } from '@signalwire/core'
import { NetworkIssue, NetworkIssueType, WebRTCStatsMonitor } from '@signalwire/webrtc'
import { CallRecoveryTrigger } from './callRecoveryManager'

export interface NetworkIssueDetectorConfig {
  triggers: CallRecoveryTrigger[]
  aggregationWindow: number // milliseconds
  severityThreshold: 'warning' | 'critical'
  issueCountThreshold: number
  cooldownPeriod: number // milliseconds between same issue types
}

export interface AggregatedIssue {
  type: NetworkIssueType
  count: number
  firstSeen: number
  lastSeen: number
  severity: 'warning' | 'critical'
  shouldTriggerRecovery: boolean
}

export interface NetworkIssueDetectorEvents {
  'issue.detected': (issue: NetworkIssue) => void
  'issue.aggregated': (aggregated: AggregatedIssue) => void
  'recovery.recommended': (issue: NetworkIssue, trigger: CallRecoveryTrigger) => void
}

const DEFAULT_CONFIG: NetworkIssueDetectorConfig = {
  triggers: ['ice_failed', 'no_packets', 'connection_failed'],
  aggregationWindow: 10000, // 10 seconds
  severityThreshold: 'warning',
  issueCountThreshold: 2, // Require 2+ issues before triggering
  cooldownPeriod: 30000 // 30 seconds cooldown
}

export class NetworkIssueDetector {
  private config: NetworkIssueDetectorConfig
  private eventListeners: Map<keyof NetworkIssueDetectorEvents, Set<Function>> = new Map()
  private issueHistory: Map<NetworkIssueType, NetworkIssue[]> = new Map()
  private lastTriggerTime: Map<NetworkIssueType, number> = new Map()
  private statsMonitor?: WebRTCStatsMonitor
  private logger = getLogger()

  constructor(config: Partial<NetworkIssueDetectorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.logger.debug('NetworkIssueDetector initialized', this.config)
  }

  /**
   * Start monitoring network issues from WebRTC stats monitor
   */
  public startMonitoring(statsMonitor?: WebRTCStatsMonitor): void {
    if (statsMonitor) {
      this.statsMonitor = statsMonitor
    }
    
    if (!this.statsMonitor) {
      this.logger.warn('No WebRTC stats monitor provided for network issue detection')
      return
    }
    
    // Listen for network issues from the stats monitor
    this.statsMonitor.on('network.issue.detected', (issue) => {
      this.handleNetworkIssue(issue)
    })
    
    this.logger.info('Network issue detection started')
  }

  /**
   * Stop monitoring network issues
   */
  public stopMonitoring(): void {
    if (this.statsMonitor) {
      this.statsMonitor.off('network.issue.detected', this.handleNetworkIssue.bind(this))
    }
    
    // Clear issue history
    this.issueHistory.clear()
    this.lastTriggerTime.clear()
    
    this.logger.info('Network issue detection stopped')
  }

  /**
   * Manually report a network issue
   */
  public reportIssue(issue: NetworkIssue): void {
    this.handleNetworkIssue(issue)
  }

  /**
   * Get current issue history
   */
  public getIssueHistory(): Map<NetworkIssueType, NetworkIssue[]> {
    return new Map(this.issueHistory)
  }

  /**
   * Get aggregated issues within the current window
   */
  public getAggregatedIssues(): AggregatedIssue[] {
    const now = Date.now()
    const windowStart = now - this.config.aggregationWindow
    const aggregated: AggregatedIssue[] = []
    
    for (const [type, issues] of this.issueHistory.entries()) {
      const recentIssues = issues.filter(issue => issue.timestamp >= windowStart)
      
      if (recentIssues.length > 0) {
        const criticalIssues = recentIssues.filter(issue => issue.severity === 'critical')
        const severity = criticalIssues.length > 0 ? 'critical' : 'warning'
        
        aggregated.push({
          type,
          count: recentIssues.length,
          firstSeen: Math.min(...recentIssues.map(i => i.timestamp)),
          lastSeen: Math.max(...recentIssues.map(i => i.timestamp)),
          severity,
          shouldTriggerRecovery: this.shouldTriggerRecovery(type, recentIssues.length, severity)
        })
      }
    }
    
    return aggregated
  }

  /**
   * Update detector configuration
   */
  public updateConfig(newConfig: Partial<NetworkIssueDetectorConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.logger.debug('NetworkIssueDetector configuration updated', this.config)
  }

  /**
   * Get current configuration
   */
  public getConfig(): NetworkIssueDetectorConfig {
    return { ...this.config }
  }

  /**
   * Add event listener
   */
  public on<K extends keyof NetworkIssueDetectorEvents>(
    event: K,
    listener: NetworkIssueDetectorEvents[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(listener)
  }

  /**
   * Remove event listener
   */
  public off<K extends keyof NetworkIssueDetectorEvents>(
    event: K,
    listener: NetworkIssueDetectorEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  private handleNetworkIssue(issue: NetworkIssue): void {
    // Add to issue history
    if (!this.issueHistory.has(issue.type)) {
      this.issueHistory.set(issue.type, [])
    }
    
    const issues = this.issueHistory.get(issue.type)!
    issues.push(issue)
    
    // Trim old issues outside aggregation window
    const windowStart = Date.now() - this.config.aggregationWindow
    this.issueHistory.set(
      issue.type,
      issues.filter(i => i.timestamp >= windowStart)
    )
    
    this.emit('issue.detected', issue)
    
    // Check if this issue should trigger recovery
    const recentIssues = this.issueHistory.get(issue.type)!
    const shouldTrigger = this.shouldTriggerRecovery(issue.type, recentIssues.length, issue.severity)
    
    if (shouldTrigger) {
      const trigger = this.mapIssueTypeToTrigger(issue.type)
      if (trigger && this.isInCooldownPeriod(issue.type)) {
        this.logger.debug(`Issue ${issue.type} in cooldown period, not triggering recovery`)
        return
      }
      
      if (trigger) {
        this.lastTriggerTime.set(issue.type, Date.now())
        this.emit('recovery.recommended', issue, trigger)
        this.logger.info(`Network issue ${issue.type} recommends recovery trigger: ${trigger}`)
      }
    }
    
    // Emit aggregated issue info
    const aggregated = this.getAggregatedIssues().find(a => a.type === issue.type)
    if (aggregated) {
      this.emit('issue.aggregated', aggregated)
    }
  }

  private shouldTriggerRecovery(
    issueType: NetworkIssueType,
    issueCount: number,
    severity: 'warning' | 'critical'
  ): boolean {
    // Check if issue type maps to a configured trigger
    const trigger = this.mapIssueTypeToTrigger(issueType)
    if (!trigger || !this.config.triggers.includes(trigger)) {
      return false
    }
    
    // Check severity threshold
    if (severity === 'warning' && this.config.severityThreshold === 'critical') {
      return false
    }
    
    // Check issue count threshold
    if (issueCount < this.config.issueCountThreshold) {
      return false
    }
    
    // Check cooldown period
    if (this.isInCooldownPeriod(issueType)) {
      return false
    }
    
    return true
  }

  private isInCooldownPeriod(issueType: NetworkIssueType): boolean {
    const lastTrigger = this.lastTriggerTime.get(issueType)
    if (!lastTrigger) {
      return false
    }
    
    const timeSinceLastTrigger = Date.now() - lastTrigger
    return timeSinceLastTrigger < this.config.cooldownPeriod
  }

  private mapIssueTypeToTrigger(issueType: NetworkIssueType): CallRecoveryTrigger | null {
    const mapping: Record<NetworkIssueType, CallRecoveryTrigger> = {
      [NetworkIssueType.NO_INBOUND_PACKETS]: 'no_packets',
      [NetworkIssueType.HIGH_PACKET_LOSS]: 'high_packet_loss',
      [NetworkIssueType.ICE_DISCONNECTED]: 'ice_failed',
      [NetworkIssueType.CONNECTION_FAILED]: 'connection_failed',
      [NetworkIssueType.DTLS_FAILED]: 'dtls_failed',
      [NetworkIssueType.HIGH_RTT]: 'no_packets', // Map high RTT to no_packets trigger
      [NetworkIssueType.HIGH_JITTER]: 'no_packets' // Map high jitter to no_packets trigger
    }
    
    return mapping[issueType] || null
  }

  private emit<K extends keyof NetworkIssueDetectorEvents>(
    event: K,
    ...args: Parameters<NetworkIssueDetectorEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as any)(...args)
        } catch (error) {
          this.logger.error(`Error in network detector event listener for ${event}:`, error)
        }
      })
    }
  }

  /**
   * Clear all issue history and reset state
   */
  public reset(): void {
    this.issueHistory.clear()
    this.lastTriggerTime.clear()
    this.logger.debug('NetworkIssueDetector reset')
  }

  /**
   * Cleanup and destroy the detector
   */
  public destroy(): void {
    this.stopMonitoring()
    this.eventListeners.clear()
    this.reset()
    this.logger.debug('NetworkIssueDetector destroyed')
  }
}