/**
 * WebRTC Statistics Collector
 *
 * This class collects and processes WebRTC statistics from RTCPeerConnection,
 * handling cross-browser differences and providing computed metrics.
 *
 * Features:
 * - Collects inbound-rtp, outbound-rtp, and candidate-pair statistics
 * - Handles browser differences (Chrome, Firefox, Safari)
 * - Maintains metrics history with configurable retention
 * - Calculates computed metrics (packet loss rate, bandwidth changes, etc)
 * - Supports both audio and video track statistics
 * - Memory efficient with automatic history cleanup
 */

import {
  IStatsCollector,
  StatsMetrics,
  InboundRTPStats,
  ComputedMetrics,
} from './interfaces'
import { HISTORY_LIMITS } from './constants'
import { getLogger } from '@signalwire/core'

/**
 * Historical metrics entry for trend calculation
 */
interface MetricsHistoryEntry {
  metrics: StatsMetrics
  timestamp: number
}

/**
 * Previous stats values for delta calculation
 */
interface PreviousStats {
  inbound: Map<string, InboundRTPStats>
  outbound: Map<string, any>
  candidatePair: Map<string, any>
  timestamp: number
}

/**
 * Configuration options for MetricsCollector
 */
export interface MetricsCollectorOptions {
  /** Maximum number of history entries to retain */
  historySize?: number
  /** Enable detailed logging */
  verbose?: boolean
  /** Browser-specific optimizations */
  browserOptimizations?: boolean
  /** Enable computed metrics calculation */
  enableComputedMetrics?: boolean
  /** Minimum interval between collections in milliseconds */
  minCollectionInterval?: number
}

/**
 * WebRTC Statistics Collector
 *
 * Collects comprehensive WebRTC statistics from RTCPeerConnection instances,
 * handles browser compatibility issues, and provides computed metrics.
 */
export class MetricsCollector implements IStatsCollector {
  private readonly peerConnection: RTCPeerConnection
  private readonly options: Required<MetricsCollectorOptions>
  private readonly history: MetricsHistoryEntry[] = []
  private previousStats: PreviousStats | null = null
  private lastCollectionTime = 0
  private readonly logger = getLogger()
  private readonly isFirefox: boolean
  private readonly isChrome: boolean
  private readonly isSafari: boolean

  constructor(
    peerConnection: RTCPeerConnection,
    options: MetricsCollectorOptions = {}
  ) {
    this.peerConnection = peerConnection
    this.options = {
      historySize: options.historySize ?? HISTORY_LIMITS.METRICS_HISTORY_SIZE,
      verbose: options.verbose ?? true,
      browserOptimizations: options.browserOptimizations ?? true,
      enableComputedMetrics: options.enableComputedMetrics ?? true,
      minCollectionInterval: options.minCollectionInterval ?? 500,
    }

    // Detect browser type for optimization
    this.isFirefox = this.detectBrowser('Firefox')
    this.isChrome = this.detectBrowser('Chrome')
    this.isSafari = this.detectBrowser('Safari')

    this.logger.info('MetricsCollector initialized', {
      browser: this.getBrowserName(),
      options: this.options,
    })
  }

  /**
   * Collect current WebRTC statistics
   *
   * @returns Promise resolving to current metrics
   */
  async collect(): Promise<StatsMetrics> {
    const now = Date.now()

    // Throttle collection to prevent excessive calls
    if (now - this.lastCollectionTime < this.options.minCollectionInterval) {
      if (this.history.length > 0) {
        return this.history[this.history.length - 1].metrics
      }
    }

    try {
      this.log('Starting stats collection')

      // Get raw stats from peer connection
      const stats = await this.peerConnection.getStats()

      // Parse and process stats
      const metrics = await this.parseStats(stats, now)

      // Add to history
      this.addToHistory(metrics, now)

      // Update collection timestamp
      this.lastCollectionTime = now

      this.log('Stats collection completed', { metrics })

      return metrics
    } catch (error) {
      this.logError('Failed to collect stats', error)

      // Return empty metrics on error
      return this.createEmptyMetrics(now)
    }
  }

  /**
   * Get a specific metric value
   *
   * @param name - Metric name to retrieve
   * @returns Metric value or undefined if not available
   */
  getMetric(name: keyof StatsMetrics): number | undefined {
    if (this.history.length === 0) {
      return undefined
    }

    const latest = this.history[this.history.length - 1].metrics
    return latest[name] as number | undefined
  }

  /**
   * Get the latest collected metrics
   *
   * @returns Latest metrics or null if none collected
   */
  getLatestMetrics(): StatsMetrics | null {
    if (this.history.length === 0) {
      return null
    }
    return this.history[this.history.length - 1].metrics
  }

  /**
   * Get metrics history
   *
   * @param limit - Maximum number of entries to return
   * @returns Array of historical metrics
   */
  getMetricsHistory(limit?: number): MetricsHistoryEntry[] {
    const actualLimit = limit ?? this.history.length
    return this.history.slice(-actualLimit)
  }

  /**
   * Clear metrics history
   */
  clearHistory(): void {
    this.history.length = 0
    this.previousStats = null
    this.log('Metrics history cleared')
  }

  /**
   * Reset the collector to initial state
   */
  reset(): void {
    this.clearHistory()
    this.lastCollectionTime = 0
    this.log('MetricsCollector reset')
  }

  /**
   * Get computed metrics from current and historical data
   *
   * @returns Computed metrics or null if insufficient data
   */
  getComputedMetrics(): ComputedMetrics | null {
    if (!this.options.enableComputedMetrics || this.history.length < 2) {
      return null
    }

    const latest = this.history[this.history.length - 1].metrics
    const previous = this.history[this.history.length - 2].metrics

    return this.calculateComputedMetrics(latest, previous)
  }

  /**
   * Parse raw WebRTC stats into standardized metrics
   *
   * @param stats - Raw stats from getStats()
   * @param timestamp - Collection timestamp
   * @returns Parsed metrics
   */
  private async parseStats(
    stats: RTCStatsReport,
    timestamp: number
  ): Promise<StatsMetrics> {
    const inboundStats = new Map<string, InboundRTPStats>()
    const outboundStats = new Map<string, any>()
    const candidatePairStats = new Map<string, any>()
    const trackStats = new Map<string, any>()

    // Categorize stats by type
    for (const [id, stat] of stats) {
      try {
        switch (stat.type) {
          case 'inbound-rtp':
            inboundStats.set(id, this.parseInboundRTPStats(stat))
            break
          case 'outbound-rtp':
            outboundStats.set(id, stat)
            break
          case 'candidate-pair':
            candidatePairStats.set(id, stat)
            break
          case 'track':
            trackStats.set(id, stat)
            break
        }
      } catch (error) {
        this.logError(`Failed to parse ${stat.type} stats`, error)
      }
    }

    // Calculate aggregated metrics
    const metrics = this.calculateMetrics(
      inboundStats,
      outboundStats,
      candidatePairStats,
      trackStats,
      timestamp
    )

    // Calculate deltas if previous stats available
    if (this.previousStats) {
      this.calculateDeltas(
        metrics,
        inboundStats,
        outboundStats,
        candidatePairStats
      )
    }

    // Store current stats for next delta calculation
    this.previousStats = {
      inbound: inboundStats,
      outbound: outboundStats,
      candidatePair: candidatePairStats,
      timestamp,
    }

    return metrics
  }

  /**
   * Parse inbound RTP statistics with browser compatibility
   *
   * @param stat - Raw inbound RTP stat
   * @returns Parsed inbound RTP stats
   */
  private parseInboundRTPStats(stat: any): InboundRTPStats {
    // Handle browser differences in property names
    const getStatValue = (propNames: string[]): any => {
      for (const prop of propNames) {
        if (stat[prop] !== undefined) {
          return stat[prop]
        }
      }
      return undefined
    }

    return {
      id: stat.id,
      timestamp: stat.timestamp,
      kind: stat.kind || stat.mediaType,
      trackId: stat.trackId || stat.trackIdentifier,
      ssrc: stat.ssrc,
      packetsReceived: getStatValue(['packetsReceived']) || 0,
      packetsLost: getStatValue(['packetsLost']) || 0,
      jitter: getStatValue(['jitter', 'jitterBufferDelay']) || 0,
      bytesReceived: getStatValue(['bytesReceived']) || 0,
      lastPacketReceivedTimestamp: getStatValue([
        'lastPacketReceivedTimestamp',
      ]),
      headerBytesReceived: getStatValue(['headerBytesReceived']),
      packetsDiscarded: getStatValue(['packetsDiscarded']),
      fecPacketsReceived: getStatValue(['fecPacketsReceived']),
      fecPacketsDiscarded: getStatValue(['fecPacketsDiscarded']),
      concealedSamples: getStatValue(['concealedSamples']),
      silentConcealedSamples: getStatValue(['silentConcealedSamples']),
      concealmentEvents: getStatValue(['concealmentEvents']),
      insertedSamplesForDeceleration: getStatValue([
        'insertedSamplesForDeceleration',
      ]),
      removedSamplesForAcceleration: getStatValue([
        'removedSamplesForAcceleration',
      ]),
      audioLevel: getStatValue(['audioLevel']),
      totalAudioEnergy: getStatValue(['totalAudioEnergy']),
      totalSamplesDuration: getStatValue(['totalSamplesDuration']),
      framesReceived: getStatValue(['framesReceived']),
      frameWidth: getStatValue(['frameWidth']),
      frameHeight: getStatValue(['frameHeight']),
      framesPerSecond: getStatValue(['framesPerSecond']),
      framesDecoded: getStatValue(['framesDecoded']),
      keyFramesDecoded: getStatValue(['keyFramesDecoded']),
      framesDropped: getStatValue(['framesDropped']),
      totalDecodeTime: getStatValue(['totalDecodeTime']),
      totalInterFrameDelay: getStatValue(['totalInterFrameDelay']),
      totalSquaredInterFrameDelay: getStatValue([
        'totalSquaredInterFrameDelay',
      ]),
      pauseCount: getStatValue(['pauseCount']),
      totalPausesDuration: getStatValue(['totalPausesDuration']),
      freezeCount: getStatValue(['freezeCount']),
      totalFreezesDuration: getStatValue(['totalFreezesDuration']),
      firCount: getStatValue(['firCount']),
      pliCount: getStatValue(['pliCount']),
      nackCount: getStatValue(['nackCount']),
    }
  }

  /**
   * Calculate aggregated metrics from parsed stats
   *
   * @param inboundStats - Parsed inbound stats
   * @param outboundStats - Raw outbound stats
   * @param candidatePairStats - Raw candidate pair stats
   * @param trackStats - Raw track stats
   * @param timestamp - Collection timestamp
   * @returns Calculated metrics
   */
  private calculateMetrics(
    inboundStats: Map<string, InboundRTPStats>,
    outboundStats: Map<string, any>,
    candidatePairStats: Map<string, any>,
    _trackStats: Map<string, any>,
    timestamp: number
  ): StatsMetrics {
    let totalPacketsReceived = 0
    let totalPacketsLost = 0
    let totalBytesReceived = 0
    let totalBytesSent = 0
    let totalPacketsSent = 0
    let weightedJitter = 0
    let rtt = 0
    let bandwidth = 0
    let audioLevel: number | undefined
    let frameRate: number | undefined
    let frameWidth: number | undefined
    let frameHeight: number | undefined
    let freezeCount: number | undefined
    let pauseCount: number | undefined
    let totalFreezesDuration: number | undefined
    let totalPausesDuration: number | undefined

    // Aggregate inbound stats
    for (const [, stat] of inboundStats) {
      totalPacketsReceived += stat.packetsReceived
      totalPacketsLost += stat.packetsLost
      totalBytesReceived += stat.bytesReceived

      // Weight jitter by packet count
      if (stat.jitter && stat.packetsReceived > 0) {
        weightedJitter += stat.jitter * stat.packetsReceived
      }

      // Collect media-specific metrics
      if (stat.kind === 'audio' && stat.audioLevel !== undefined) {
        audioLevel = stat.audioLevel
      }

      if (stat.kind === 'video') {
        if (stat.framesPerSecond !== undefined) {
          frameRate = stat.framesPerSecond
        }
        if (stat.frameWidth !== undefined) {
          frameWidth = stat.frameWidth
        }
        if (stat.frameHeight !== undefined) {
          frameHeight = stat.frameHeight
        }
        if (stat.freezeCount !== undefined) {
          freezeCount = stat.freezeCount
        }
        if (stat.pauseCount !== undefined) {
          pauseCount = stat.pauseCount
        }
        if (stat.totalFreezesDuration !== undefined) {
          totalFreezesDuration = stat.totalFreezesDuration
        }
        if (stat.totalPausesDuration !== undefined) {
          totalPausesDuration = stat.totalPausesDuration
        }
      }
    }

    // Aggregate outbound stats
    for (const [, stat] of outboundStats) {
      if (stat.bytesSent !== undefined) {
        totalBytesSent += stat.bytesSent
      }
      if (stat.packetsSent !== undefined) {
        totalPacketsSent += stat.packetsSent
      }
    }

    // Get RTT and bandwidth from candidate pair stats
    const activeCandidatePair = this.findActiveCandidatePair(candidatePairStats)
    if (activeCandidatePair) {
      rtt = this.extractRTT(activeCandidatePair)
      bandwidth = this.extractBandwidth(activeCandidatePair)
    }

    // Calculate packet loss rate
    const packetLoss =
      totalPacketsReceived > 0
        ? totalPacketsLost / (totalPacketsReceived + totalPacketsLost)
        : 0

    // Calculate average jitter
    const jitter =
      totalPacketsReceived > 0
        ? (weightedJitter / totalPacketsReceived) * 1000 // Convert to milliseconds
        : 0

    return {
      packetLoss,
      jitter,
      rtt,
      bandwidth,
      packetsSent: totalPacketsSent,
      packetsReceived: totalPacketsReceived,
      bytesSent: totalBytesSent,
      bytesReceived: totalBytesReceived,
      audioLevel,
      frameRate,
      frameWidth,
      frameHeight,
      freezeCount,
      pauseCount,
      totalFreezesDuration,
      totalPausesDuration,
      timestamp,
    }
  }

  /**
   * Calculate delta values between current and previous collections
   *
   * @param metrics - Current metrics to update with deltas
   * @param inboundStats - Current inbound stats
   * @param outboundStats - Current outbound stats
   * @param candidatePairStats - Current candidate pair stats
   */
  private calculateDeltas(
    metrics: StatsMetrics,
    inboundStats: Map<string, InboundRTPStats>,
    outboundStats: Map<string, any>,
    _candidatePairStats: Map<string, any>
  ): void {
    if (!this.previousStats) return

    const timeDelta = (metrics.timestamp - this.previousStats.timestamp) / 1000 // Convert to seconds

    if (timeDelta <= 0) return

    // Calculate bandwidth from byte deltas
    let bytesSentDelta = 0
    let bytesReceivedDelta = 0

    // Calculate received bytes delta
    for (const [id, currentStat] of inboundStats) {
      const previousStat = this.previousStats.inbound.get(id)
      if (previousStat) {
        bytesReceivedDelta += Math.max(
          0,
          currentStat.bytesReceived - previousStat.bytesReceived
        )
      }
    }

    // Calculate sent bytes delta
    for (const [id, currentStat] of outboundStats) {
      const previousStat = this.previousStats.outbound.get(id)
      if (
        previousStat &&
        currentStat.bytesSent !== undefined &&
        previousStat.bytesSent !== undefined
      ) {
        bytesSentDelta += Math.max(
          0,
          currentStat.bytesSent - previousStat.bytesSent
        )
      }
    }

    // Calculate instantaneous bandwidth (kbps)
    const totalBytesDelta = bytesSentDelta + bytesReceivedDelta
    const instantaneousBandwidth = (totalBytesDelta * 8) / (timeDelta * 1000) // Convert to kbps

    // Use instantaneous bandwidth if available and reasonable
    if (instantaneousBandwidth > 0 && instantaneousBandwidth < 100000) {
      // Cap at 100 Mbps for sanity
      metrics.bandwidth = Math.max(metrics.bandwidth, instantaneousBandwidth)
    }
  }

  /**
   * Find the active candidate pair from candidate pair stats
   *
   * @param candidatePairStats - Candidate pair statistics
   * @returns Active candidate pair or null
   */
  private findActiveCandidatePair(
    candidatePairStats: Map<string, any>
  ): any | null {
    let activePair: any = null
    let maxBytesSent = 0

    for (const [, stat] of candidatePairStats) {
      // Look for active or nominated pairs
      if (stat.state === 'succeeded' || stat.nominated) {
        const bytesSent = stat.bytesSent || 0
        if (bytesSent > maxBytesSent) {
          maxBytesSent = bytesSent
          activePair = stat
        }
      }
    }

    // Fallback: find pair with most traffic
    if (!activePair) {
      for (const [, stat] of candidatePairStats) {
        const bytesSent = stat.bytesSent || 0
        if (bytesSent > maxBytesSent) {
          maxBytesSent = bytesSent
          activePair = stat
        }
      }
    }

    return activePair
  }

  /**
   * Extract RTT from candidate pair stats
   *
   * @param candidatePair - Candidate pair stats
   * @returns RTT in milliseconds
   */
  private extractRTT(candidatePair: any): number {
    // Try different RTT property names
    const rttProps = ['currentRoundTripTime', 'roundTripTime', 'rtt']

    for (const prop of rttProps) {
      if (candidatePair[prop] !== undefined) {
        return candidatePair[prop] * 1000 // Convert to milliseconds
      }
    }

    return 0
  }

  /**
   * Extract bandwidth from candidate pair stats
   *
   * @param candidatePair - Candidate pair stats
   * @returns Bandwidth in kbps
   */
  private extractBandwidth(candidatePair: any): number {
    // Try available bandwidth properties
    const incomingBandwidth = candidatePair.availableIncomingBitrate
    const outgoingBandwidth = candidatePair.availableOutgoingBitrate

    if (incomingBandwidth !== undefined && outgoingBandwidth !== undefined) {
      return (incomingBandwidth + outgoingBandwidth) / 2000 // Convert to kbps and average
    } else if (incomingBandwidth !== undefined) {
      return incomingBandwidth / 1000 // Convert to kbps
    } else if (outgoingBandwidth !== undefined) {
      return outgoingBandwidth / 1000 // Convert to kbps
    }

    return 0
  }

  /**
   * Calculate computed metrics from current and previous metrics
   *
   * @param current - Current metrics
   * @param previous - Previous metrics
   * @returns Computed metrics
   */
  private calculateComputedMetrics(
    current: StatsMetrics,
    previous: StatsMetrics
  ): ComputedMetrics {
    // Calculate trends
    const packetLossTrend = this.calculateTrend(
      current.packetLoss,
      previous.packetLoss
    )
    const jitterTrend = this.calculateTrend(
      current.jitter,
      previous.jitter,
      true
    )
    const rttTrend = this.calculateTrend(current.rtt, previous.rtt, true)
    const bandwidthTrend = this.calculateTrend(
      current.bandwidth,
      previous.bandwidth
    )

    // Calculate quality scores
    const audioQualityScore = this.calculateAudioQualityScore(current)
    const videoQualityScore = this.calculateVideoQualityScore(current)
    const overallQualityScore = this.calculateOverallQualityScore(current)

    return {
      packetLossRate: current.packetLoss,
      averageJitter: current.jitter,
      averageRtt: current.rtt,
      currentBandwidth: current.bandwidth,
      audioQualityScore,
      videoQualityScore,
      overallQualityScore,
      trends: {
        packetLoss: packetLossTrend,
        jitter: jitterTrend,
        rtt: rttTrend,
        bandwidth: bandwidthTrend,
      },
      timestamp: current.timestamp,
    }
  }

  /**
   * Calculate trend direction
   *
   * @param current - Current value
   * @param previous - Previous value
   * @param lowerIsBetter - Whether lower values are better
   * @returns Trend direction
   */
  private calculateTrend(
    current: number,
    previous: number,
    lowerIsBetter = false
  ): 'improving' | 'stable' | 'degrading' {
    const threshold = 0.05 // 5% change threshold
    const change = Math.abs(current - previous) / (previous || 1)

    if (change < threshold) {
      return 'stable'
    }

    const isImproving = lowerIsBetter ? current < previous : current > previous
    return isImproving ? 'improving' : 'degrading'
  }

  /**
   * Calculate audio quality score (0-100)
   *
   * @param metrics - Current metrics
   * @returns Audio quality score
   */
  private calculateAudioQualityScore(
    metrics: StatsMetrics
  ): number | undefined {
    if (metrics.audioLevel === undefined) {
      return undefined
    }

    let score = 100

    // Penalize packet loss
    score -= metrics.packetLoss * 300 // 10% loss = 30 point penalty

    // Penalize high jitter
    if (metrics.jitter > 30) {
      score -= (metrics.jitter - 30) * 2
    }

    // Penalize high RTT
    if (metrics.rtt > 150) {
      score -= (metrics.rtt - 150) * 0.5
    }

    // Penalize low audio level
    if (metrics.audioLevel < 0.01) {
      score -= 20
    }

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  /**
   * Calculate video quality score (0-100)
   *
   * @param metrics - Current metrics
   * @returns Video quality score
   */
  private calculateVideoQualityScore(
    metrics: StatsMetrics
  ): number | undefined {
    if (metrics.frameRate === undefined) {
      return undefined
    }

    let score = 100

    // Penalize packet loss more heavily for video
    score -= metrics.packetLoss * 400 // 10% loss = 40 point penalty

    // Penalize low frame rate
    if (metrics.frameRate < 15) {
      score -= (15 - metrics.frameRate) * 5
    }

    // Penalize freezes
    if (metrics.freezeCount && metrics.freezeCount > 0) {
      score -= metrics.freezeCount * 10
    }

    // Penalize pauses
    if (metrics.pauseCount && metrics.pauseCount > 0) {
      score -= metrics.pauseCount * 5
    }

    // Penalize high jitter
    if (metrics.jitter > 50) {
      score -= (metrics.jitter - 50) * 1
    }

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  /**
   * Calculate overall quality score (0-100)
   *
   * @param metrics - Current metrics
   * @returns Overall quality score
   */
  private calculateOverallQualityScore(metrics: StatsMetrics): number {
    let score = 100

    // Base penalties for key metrics
    score -= metrics.packetLoss * 350 // 10% loss = 35 point penalty
    score -= Math.min(metrics.jitter / 2, 25) // Cap jitter penalty at 25 points
    score -= Math.min((metrics.rtt - 100) * 0.1, 15) // Cap RTT penalty at 15 points

    // Bandwidth penalty if very low
    if (metrics.bandwidth < 100) {
      // Less than 100 kbps
      score -= (100 - metrics.bandwidth) * 0.2
    }

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  /**
   * Add metrics to history with automatic cleanup
   *
   * @param metrics - Metrics to add
   * @param timestamp - Collection timestamp
   */
  private addToHistory(metrics: StatsMetrics, timestamp: number): void {
    this.history.push({ metrics, timestamp })

    // Cleanup old entries
    while (this.history.length > this.options.historySize) {
      this.history.shift()
    }
  }

  /**
   * Create empty metrics object
   *
   * @param timestamp - Collection timestamp
   * @returns Empty metrics
   */
  private createEmptyMetrics(timestamp: number): StatsMetrics {
    return {
      packetLoss: 0,
      jitter: 0,
      rtt: 0,
      bandwidth: 0,
      packetsSent: 0,
      packetsReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
      timestamp,
    }
  }

  /**
   * Detect browser type
   *
   * @param browserName - Browser name to check
   * @returns True if browser matches
   */
  private detectBrowser(browserName: string): boolean {
    if (
      typeof navigator === 'undefined' ||
      typeof navigator.userAgent === 'undefined'
    ) {
      return false
    }
    return navigator.userAgent.indexOf(browserName) !== -1
  }

  /**
   * Get human-readable browser name
   *
   * @returns Browser name
   */
  private getBrowserName(): string {
    let browserName = ''
    if (this.isFirefox) {
      browserName = 'Firefox'
    }
    if (this.isChrome) {
      browserName = `${browserName}|Chrome`
    }
    if (this.isSafari) {
      browserName = `${browserName}|Safari`
    }
    return browserName.length ? browserName : 'Unknown'
  }

  /**
   * Log debug message if verbose logging enabled
   *
   * @param message - Log message
   * @param data - Optional data to log
   */
  private log(message: string, data?: any): void {
    if (this.options.verbose) {
      this.logger.debug(`[MetricsCollector] ${message}`, data || '')
    }
  }

  /**
   * Log error message
   *
   * @param message - Error message
   * @param error - Error object
   */
  private logError(message: string, error: any): void {
    this.logger.error(`[MetricsCollector] ${message}`, error)
  }
}
