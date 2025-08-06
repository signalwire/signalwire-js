/**
 * WebRTC Statistics Monitor
 * 
 * Provides real-time monitoring of WebRTC connection quality including:
 * - Network statistics (RTT, jitter, packet loss)
 * - Connection state monitoring
 * - Automated issue detection and reporting
 * - Baseline establishment for quality thresholds
 * 
 * Based on Cantina application improvements for better call reliability.
 */

export interface StatsMetrics {
  timestamp: number
  packetsReceived: number
  bytesReceived: number
  packetsLost: number
  roundTripTime: number
  jitter: number
  availableOutgoingBitrate?: number
  availableIncomingBitrate?: number
  currentRoundTripTime?: number
}

export interface NetworkQualityState {
  isHealthy: boolean
  warningCount: number
  lastPacketTime: number
  metrics: StatsMetrics[]
  baseline: {
    rtt: number
    jitter: number
    packetLossRate: number
  } | null
}

export enum NetworkIssueType {
  NO_INBOUND_PACKETS = 'no_inbound_packets',
  HIGH_RTT = 'high_rtt',
  HIGH_PACKET_LOSS = 'high_packet_loss',
  HIGH_JITTER = 'high_jitter',
  ICE_DISCONNECTED = 'ice_disconnected',
  DTLS_FAILED = 'dtls_failed',
  CONNECTION_FAILED = 'connection_failed'
}

export interface NetworkIssue {
  type: NetworkIssueType
  severity: 'warning' | 'critical'
  timestamp: number
  value?: number
  description?: string
}

export interface WebRTCMonitoringConfig {
  pollInterval: number
  baselineWindowSize: number
  qualityThresholds: {
    rttWarning: number
    rttCritical: number
    packetLossWarning: number
    packetLossCritical: number
    jitterWarning: number
    jitterCritical: number
    noPacketsTimeout: number
  }
  maxMetricsHistory: number
}

export interface WebRTCMonitorEvents {
  'stats.collected': (metrics: StatsMetrics) => void
  'network.issue.detected': (issue: NetworkIssue) => void
  'network.quality.changed': (isHealthy: boolean, previousState: boolean) => void
  'baseline.established': (baseline: NetworkQualityState['baseline']) => void
}

const DEFAULT_CONFIG: WebRTCMonitoringConfig = {
  pollInterval: 1000, // 1 second
  baselineWindowSize: 10, // 10 samples for baseline
  qualityThresholds: {
    rttWarning: 200, // ms  
    rttCritical: 500, // ms
    packetLossWarning: 0.02, // 2%
    packetLossCritical: 0.05, // 5%
    jitterWarning: 30, // ms
    jitterCritical: 100, // ms
    noPacketsTimeout: 5000 // 5 seconds
  },
  maxMetricsHistory: 100 // Keep last 100 metrics
}

export class WebRTCStatsMonitor {
  private peerConnection: RTCPeerConnection | null = null
  private pollInterval: NodeJS.Timeout | null = null
  private config: WebRTCMonitoringConfig
  private state: NetworkQualityState = {
    isHealthy: true,
    warningCount: 0,
    lastPacketTime: Date.now(),
    metrics: [],
    baseline: null
  }
  private eventListeners: Map<keyof WebRTCMonitorEvents, Set<Function>> = new Map()
  private isMonitoring = false
  private lastConnectionState: RTCPeerConnectionState | null = null

  constructor(config: Partial<WebRTCMonitoringConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.initializeEventListeners()
  }

  private initializeEventListeners(): void {
    Object.keys(DEFAULT_CONFIG).forEach(() => {
      // Initialize empty listener sets for each event type
    })
  }

  /**
   * Start monitoring a WebRTC peer connection
   */
  public startMonitoring(peerConnection: RTCPeerConnection): void {
    if (this.isMonitoring) {
      this.stopMonitoring()
    }

    this.peerConnection = peerConnection
    this.isMonitoring = true
    this.lastConnectionState = peerConnection.connectionState

    // Set up connection state monitoring
    this.setupConnectionStateMonitoring()

    // Start stats polling
    this.pollInterval = setInterval(() => {
      this.collectStats()
    }, this.config.pollInterval)

    console.debug('WebRTC Statistics Monitor started')
  }

  /**
   * Stop monitoring and cleanup
   */
  public stopMonitoring(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }

    this.isMonitoring = false
    this.peerConnection = null
    this.resetState()

    console.debug('WebRTC Statistics Monitor stopped')
  }

  /**
   * Add event listener
   */
  public on<K extends keyof WebRTCMonitorEvents>(
    event: K, 
    listener: WebRTCMonitorEvents[K]
  ): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(listener)
  }

  /**
   * Remove event listener
   */
  public off<K extends keyof WebRTCMonitorEvents>(
    event: K, 
    listener: WebRTCMonitorEvents[K]
  ): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(listener)
    }
  }

  /**
   * Get current network quality state
   */
  public getNetworkQuality(): NetworkQualityState {
    return { ...this.state }
  }

  /**
   * Get latest metrics
   */
  public getLatestMetrics(): StatsMetrics | null {
    return this.state.metrics.length > 0 
      ? this.state.metrics[this.state.metrics.length - 1] 
      : null
  }

  private setupConnectionStateMonitoring(): void {
    if (!this.peerConnection) return

    this.peerConnection.addEventListener('connectionstatechange', () => {
      this.handleConnectionStateChange()
    })

    this.peerConnection.addEventListener('iceconnectionstatechange', () => {
      this.handleIceConnectionStateChange()
    })
  }

  private handleConnectionStateChange(): void {
    if (!this.peerConnection) return

    const currentState = this.peerConnection.connectionState
    const previousState = this.lastConnectionState

    if (currentState !== previousState) {
      console.debug(`Connection state changed: ${previousState} -> ${currentState}`)
      
      if (currentState === 'failed' || currentState === 'disconnected') {
        this.emitNetworkIssue({
          type: NetworkIssueType.CONNECTION_FAILED,
          severity: currentState === 'failed' ? 'critical' : 'warning',
          timestamp: Date.now(),
          description: `Connection state: ${currentState}`
        })
      }

      this.lastConnectionState = currentState
    }
  }

  private handleIceConnectionStateChange(): void {
    if (!this.peerConnection) return

    const iceState = this.peerConnection.iceConnectionState

    if (iceState === 'disconnected') {
      this.emitNetworkIssue({
        type: NetworkIssueType.ICE_DISCONNECTED,
        severity: 'warning',
        timestamp: Date.now(),
        description: `ICE connection state: ${iceState}`
      })
    } else if (iceState === 'failed') {
      this.emitNetworkIssue({
        type: NetworkIssueType.ICE_DISCONNECTED,
        severity: 'critical', 
        timestamp: Date.now(),
        description: `ICE connection state: ${iceState}`
      })
    }
  }

  private async collectStats(): Promise<void> {
    if (!this.peerConnection || !this.isMonitoring) return

    try {
      const stats = await this.peerConnection.getStats()
      const metrics = this.parseStats(stats)
      
      if (metrics) {
        this.processMetrics(metrics)
        this.emit('stats.collected', metrics)
      }
    } catch (error) {
      console.error('Failed to collect WebRTC stats:', error)
    }
  }

  private parseStats(stats: RTCStatsReport): StatsMetrics | null {
    let inboundRtp: RTCInboundRtpStreamStats | null = null
    let candidatePair: RTCIceCandidatePairStats | null = null

    // Find the active inbound RTP stream and candidate pair
    stats.forEach((report) => {
      if (report.type === 'inbound-rtp' && (report as any).kind === 'video') {
        inboundRtp = report as RTCInboundRtpStreamStats
      } else if (report.type === 'candidate-pair' && (report as any).state === 'succeeded') {
        candidatePair = report as RTCIceCandidatePairStats
      }
    })

    if (!inboundRtp) {
      return null
    }

    const rtpStats = inboundRtp as any // Type assertion to access properties
    const timestamp = Date.now()
    const packetsReceived = rtpStats.packetsReceived || 0
    const bytesReceived = rtpStats.bytesReceived || 0
    const packetsLost = rtpStats.packetsLost || 0
    const jitter = (rtpStats.jitter || 0) * 1000 // Convert to milliseconds

    // RTT from candidate pair if available
    const pairStats = candidatePair as any // Type assertion to access properties
    const roundTripTime = pairStats?.currentRoundTripTime 
      ? pairStats.currentRoundTripTime * 1000 // Convert to milliseconds
      : 0

    // Available bitrate from candidate pair
    const availableOutgoingBitrate = pairStats?.availableOutgoingBitrate
    const availableIncomingBitrate = pairStats?.availableIncomingBitrate

    return {
      timestamp,
      packetsReceived,
      bytesReceived,
      packetsLost,
      roundTripTime,
      jitter,
      availableOutgoingBitrate,
      availableIncomingBitrate,
      currentRoundTripTime: pairStats?.currentRoundTripTime
    }
  }

  private processMetrics(metrics: StatsMetrics): void {
    // Add to metrics history
    this.state.metrics.push(metrics)
    
    // Trim history if too long
    if (this.state.metrics.length > this.config.maxMetricsHistory) {
      this.state.metrics = this.state.metrics.slice(-this.config.maxMetricsHistory)
    }

    // Update last packet time if we received packets
    if (metrics.packetsReceived > 0) {
      this.state.lastPacketTime = metrics.timestamp
    }

    // Establish baseline if we have enough samples
    if (!this.state.baseline && this.state.metrics.length >= this.config.baselineWindowSize) {
      this.establishBaseline()
    }

    // Analyze metrics for issues
    this.analyzeMetrics(metrics)
  }

  private establishBaseline(): void {
    const recentMetrics = this.state.metrics.slice(-this.config.baselineWindowSize)
    
    const avgRtt = recentMetrics.reduce((sum, m) => sum + m.roundTripTime, 0) / recentMetrics.length
    const avgJitter = recentMetrics.reduce((sum, m) => sum + m.jitter, 0) / recentMetrics.length
    
    // Calculate packet loss rate
    const totalPackets = recentMetrics.reduce((sum, m) => sum + m.packetsReceived + m.packetsLost, 0)
    const totalLost = recentMetrics.reduce((sum, m) => sum + m.packetsLost, 0)
    const packetLossRate = totalPackets > 0 ? totalLost / totalPackets : 0

    this.state.baseline = {
      rtt: avgRtt,
      jitter: avgJitter,
      packetLossRate
    }

    this.emit('baseline.established', this.state.baseline)
    console.debug('Network quality baseline established:', this.state.baseline)
  }

  private analyzeMetrics(metrics: StatsMetrics): void {
    const issues: NetworkIssue[] = []

    // Check for no inbound packets
    const timeSinceLastPacket = metrics.timestamp - this.state.lastPacketTime
    if (timeSinceLastPacket > this.config.qualityThresholds.noPacketsTimeout) {
      issues.push({
        type: NetworkIssueType.NO_INBOUND_PACKETS,
        severity: 'critical',
        timestamp: metrics.timestamp,
        value: timeSinceLastPacket,
        description: `No packets received for ${timeSinceLastPacket}ms`
      })
    }

    // Check RTT thresholds
    if (metrics.roundTripTime > this.config.qualityThresholds.rttCritical) {
      issues.push({
        type: NetworkIssueType.HIGH_RTT,
        severity: 'critical',
        timestamp: metrics.timestamp,
        value: metrics.roundTripTime,
        description: `High RTT: ${metrics.roundTripTime}ms`
      })
    } else if (metrics.roundTripTime > this.config.qualityThresholds.rttWarning) {
      issues.push({
        type: NetworkIssueType.HIGH_RTT,
        severity: 'warning',
        timestamp: metrics.timestamp,
        value: metrics.roundTripTime,
        description: `Elevated RTT: ${metrics.roundTripTime}ms`
      })
    }

    // Check jitter thresholds
    if (metrics.jitter > this.config.qualityThresholds.jitterCritical) {
      issues.push({
        type: NetworkIssueType.HIGH_JITTER,
        severity: 'critical',
        timestamp: metrics.timestamp,  
        value: metrics.jitter,
        description: `High jitter: ${metrics.jitter}ms`
      })
    } else if (metrics.jitter > this.config.qualityThresholds.jitterWarning) {
      issues.push({
        type: NetworkIssueType.HIGH_JITTER,
        severity: 'warning',
        timestamp: metrics.timestamp,
        value: metrics.jitter,
        description: `Elevated jitter: ${metrics.jitter}ms`
      })
    }

    // Check packet loss (requires recent metrics for calculation)
    if (this.state.metrics.length >= 2) {
      const packetLossRate = this.calculateRecentPacketLoss()
      
      if (packetLossRate > this.config.qualityThresholds.packetLossCritical) {
        issues.push({
          type: NetworkIssueType.HIGH_PACKET_LOSS,
          severity: 'critical',
          timestamp: metrics.timestamp,
          value: packetLossRate,
          description: `High packet loss: ${(packetLossRate * 100).toFixed(1)}%`
        })
      } else if (packetLossRate > this.config.qualityThresholds.packetLossWarning) {
        issues.push({
          type: NetworkIssueType.HIGH_PACKET_LOSS,
          severity: 'warning',
          timestamp: metrics.timestamp,
          value: packetLossRate,
          description: `Elevated packet loss: ${(packetLossRate * 100).toFixed(1)}%`
        })
      }
    }

    // Emit issues
    issues.forEach(issue => this.emitNetworkIssue(issue))

    // Update health state
    this.updateHealthState(issues)
  }

  private calculateRecentPacketLoss(): number {
    if (this.state.metrics.length < 2) return 0

    const recent = this.state.metrics.slice(-5) // Last 5 samples
    let totalPackets = 0
    let totalLost = 0

    for (let i = 1; i < recent.length; i++) {
      const current = recent[i]
      const previous = recent[i - 1]
      
      const packetsReceived = current.packetsReceived - previous.packetsReceived
      const packetsLost = current.packetsLost - previous.packetsLost
      
      totalPackets += packetsReceived + packetsLost
      totalLost += packetsLost
    }

    return totalPackets > 0 ? totalLost / totalPackets : 0
  }

  private updateHealthState(issues: NetworkIssue[]): void {
    const previousHealth = this.state.isHealthy
    const hasCriticalIssues = issues.some(issue => issue.severity === 'critical')
    
    if (hasCriticalIssues) {
      this.state.isHealthy = false
      this.state.warningCount++
    } else if (issues.length === 0) {
      // No issues, gradually recover
      if (this.state.warningCount > 0) {
        this.state.warningCount--
      }
      
      // Consider healthy if warning count is low
      this.state.isHealthy = this.state.warningCount < 3
    }

    // Emit health change event
    if (this.state.isHealthy !== previousHealth) {
      this.emit('network.quality.changed', this.state.isHealthy, previousHealth)
    }
  }

  private emitNetworkIssue(issue: NetworkIssue): void {
    this.emit('network.issue.detected', issue)
    console.debug('Network issue detected:', issue)
  }

  private emit<K extends keyof WebRTCMonitorEvents>(
    event: K, 
    ...args: Parameters<WebRTCMonitorEvents[K]>
  ): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          (listener as any)(...args)
        } catch (error) {
          console.error(`Error in WebRTC monitor event listener for ${event}:`, error)
        }
      })
    }
  }

  private resetState(): void {
    this.state = {
      isHealthy: true,
      warningCount: 0,
      lastPacketTime: Date.now(),
      metrics: [],
      baseline: null
    }
  }

  /**
   * Get monitoring configuration
   */
  public getConfig(): WebRTCMonitoringConfig {
    return { ...this.config }
  }

  /**
   * Update monitoring configuration
   */
  public updateConfig(newConfig: Partial<WebRTCMonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // Restart polling with new interval if changed
    if (newConfig.pollInterval && this.isMonitoring && this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = setInterval(() => {
        this.collectStats()
      }, this.config.pollInterval)
    }
  }

  /**
   * Check if currently monitoring
   */
  public isActive(): boolean {
    return this.isMonitoring
  }
}