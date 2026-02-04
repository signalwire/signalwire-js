import { getLogger } from '@signalwire/core'
import { RTCPeerConnection } from './utils/primitives'
import {
  createMockAudioTrack,
  createMockVideoTrack,
  cleanupMockAudioTrack,
  cleanupMockVideoTrack,
} from './utils/mockTracks'

const DEFAULT_POOL_SIZE = 3
const MAX_POOL_SIZE = 10
const maxIceCandidatePoolSize = 20
const DEFAULT_ICE_GATHERING_TIMEOUT = 30000 // 30 seconds
const MAX_ICE_GATHERING_RETRIES = 3
const CIRCUIT_BREAKER_THRESHOLD = 5 // failures before opening circuit
const CIRCUIT_BREAKER_RESET_TIME = 60000 // 1 minute

class PoolError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean,
    public readonly code: string
  ) {
    super(message)
    this.name = 'PoolError'
  }
}

interface PooledConnection {
  id: string
  pc: RTCPeerConnection
  createdAt: number
  lastRefreshed: number
  iceGatheringComplete: boolean
  mockTracks: {
    audio?: MediaStreamTrack
    video?: MediaStreamTrack
  }
  transceivers: RTCRtpTransceiver[]
  eventListeners: Map<string, EventListener[]>
}

interface PoolMetrics {
  hits: number
  misses: number
  returns: number
  failures: number
  currentPoolSize: number
  inUseCount: number
  totalCreated: number
  avgConnectionAge: number
  activeTracksCount: number
  cleanupFailures: number
}

export class RTCPeerConnectionManager {
  private pool: Map<string, PooledConnection> = new Map()
  private inUseConnections: Map<RTCPeerConnection, string> = new Map()
  private config: RTCConfiguration
  private poolSize: number
  private forceRefresh: boolean
  private turnRefreshInterval: number = 240000 // 4 minutes
  private refreshTimer?: ReturnType<typeof setInterval>
  private iceGatheringTimeout: number
  private maxIceRetries: number
  private logger = getLogger()
  private metrics: PoolMetrics = {
    hits: 0,
    misses: 0,
    returns: 0,
    failures: 0,
    currentPoolSize: 0,
    inUseCount: 0,
    totalCreated: 0,
    avgConnectionAge: 0,
    activeTracksCount: 0,
    cleanupFailures: 0,
  }
  private circuitBreakerState: 'closed' | 'open' | 'half-open' = 'closed'
  private circuitBreakerFailures = 0
  private circuitBreakerResetTimer?: ReturnType<typeof setTimeout>

  constructor(
    config: RTCConfiguration,
    poolSize = DEFAULT_POOL_SIZE,
    enableAutoRefresh = true,  // Renamed from forceRefresh for clarity
    options: {
      iceGatheringTimeout?: number
      maxIceRetries?: number
      turnRefreshInterval?: number
    } = {}
  ) {
    const iceCandidatePoolSize = config.iceCandidatePoolSize || 10
    this.config = {
      ...config,
      // Ensure iceCandidatePoolSize is set for candidate reuse
      iceCandidatePoolSize:
        iceCandidatePoolSize > maxIceCandidatePoolSize
          ? maxIceCandidatePoolSize
          : iceCandidatePoolSize,
    }
    this.poolSize = poolSize > MAX_POOL_SIZE ? MAX_POOL_SIZE : poolSize
    this.forceRefresh = enableAutoRefresh
    this.turnRefreshInterval = options.turnRefreshInterval || 240000 // 4 minutes default
    this.iceGatheringTimeout = options.iceGatheringTimeout || DEFAULT_ICE_GATHERING_TIMEOUT
    this.maxIceRetries = options.maxIceRetries || MAX_ICE_GATHERING_RETRIES
  }

  /**
   * Initialize the connection pool
   */
  async initializePool(): Promise<void> {
    this.logger.info(
      `Initializing RTCPeerConnection pool with size ${this.poolSize}`
    )

    const promises: Promise<PooledConnection | null>[] = []
    for (let i = 0; i < this.poolSize; i++) {
      promises.push(this.createPooledConnection())
    }

    const connections = await Promise.all(promises)
    connections.forEach((conn) => {
      if (conn) {
        this.pool.set(conn.id, conn)
      }
    })

    this.logger.info(`Pool initialized with ${this.pool.size} connections`)

    if (this.forceRefresh) {
      this.logger.info(
        `Auto-refresh enabled: TURN allocations will be refreshed every ${this.turnRefreshInterval / 1000}s`
      )
      // Start maintenance worker for automatic TURN refresh
      this.startMaintenanceWorker()
    } else {
      this.logger.info(
        'Auto-refresh disabled: TURN allocations will not be automatically refreshed'
      )
    }
  }

  /**
   * Get a pre-warmed connection from the pool
   */
  getConnection(): RTCPeerConnection | null {
    // Find first valid connection
    for (const [id, conn] of this.pool.entries()) {
      this.logger.debug(`Checking pooled connection ${id}`)
      this.logger.debug(`Connection state: ${conn.pc.connectionState}`)
      this.logger.debug(`Signaling state: ${conn.pc.signalingState}`)
      this.logger.debug(`ICE connection state: ${conn.pc.iceConnectionState}`)
      this.logger.debug(`ICE gathering state: ${conn.pc.iceGatheringState}`)

      // Debug transceivers before cleanup
      const transceivers = conn.pc.getTransceivers()
      this.logger.debug(`Connection has ${transceivers.length} transceivers before cleanup:`)
      transceivers.forEach((t, i) => {
        const senderTrack = t.sender.track ? `${t.sender.track.kind}(${t.sender.track.id.substring(0, 8)})` : 'null'
        const receiverTrack = t.receiver.track ? `${t.receiver.track.kind}(${t.receiver.track.id.substring(0, 8)})` : 'null'
        this.logger.debug(`  Transceiver ${i}: mid=${t.mid}, direction=${t.direction}, sender.track=${senderTrack}, receiver.track=${receiverTrack}`)
      })

      if (this.isConnectionValid(conn)) {
        this.logger.info(`Providing pooled connection ${id}`)

        // Update metrics
        this.metrics.hits++

        // Remove from pool and track as in-use
        this.pool.delete(id)
        this.inUseConnections.set(conn.pc, id)

        // Clean up mock tracks completely before returning
        this.cleanupMockTracks(conn)

        // Debug transceivers after cleanup
        const transceiversAfter = conn.pc.getTransceivers()
        this.logger.debug(`After cleanup, connection has ${transceiversAfter.length} transceivers:`)
        transceiversAfter.forEach((t, i) => {
          const senderTrack = t.sender.track ? `${t.sender.track.kind}(${t.sender.track.id.substring(0, 8)})` : 'null'
          const receiverTrack = t.receiver.track ? `${t.receiver.track.kind}(${t.receiver.track.id.substring(0, 8)})` : 'null'
          this.logger.debug(`  Transceiver ${i}: mid=${t.mid}, direction=${t.direction}, sender.track=${senderTrack}, receiver.track=${receiverTrack}`)
        })

        // Replenish pool in background
        this.replenishPool().catch((err) => {
          this.logger.error('Failed to replenish pool:', err)
        })

        // Update current counts
        this.updateMetricCounts()

        // Return clean RTCPeerConnection ready for use
        return conn.pc
      }
    }

    this.logger.warn('No valid pooled connections available')
    this.metrics.misses++
    this.updateMetricCounts()
    return null
  }


  /**
   * Return a connection to the pool for reuse
   */
  returnConnection(pc: RTCPeerConnection): void {
    const connectionId = this.inUseConnections.get(pc)

    if (!connectionId) {
      this.logger.debug('Connection not tracked, cannot return to pool')
      return
    }

    this.inUseConnections.delete(pc)

    // Check if connection is still reusable
    if (
      pc.connectionState === 'closed' ||
      pc.connectionState === 'failed' ||
      pc.signalingState === 'closed'
    ) {
      this.logger.info(`Connection ${connectionId} is not reusable, closing`)
      try {
        pc.close()
      } catch (e) {
        // Ignore close errors
      }
      // Replenish pool since we lost a connection
      this.replenishPool().catch((err) => {
        this.logger.error('Failed to replenish after return:', err)
      })
      return
    }

    // Reset the connection for reuse
    try {
      // Remove any remaining tracks
      pc.getSenders().forEach(sender => {
        if (sender.track) {
          pc.removeTrack(sender)
        }
      })

      // Clear any data channels
      // Note: There's no direct API to close all data channels,
      // they should be closed by the application before returning

      // Re-add to pool
      const pooledConnection: PooledConnection = {
        id: connectionId,
        pc,
        createdAt: Date.now(),
        lastRefreshed: Date.now(),
        iceGatheringComplete: true,
        mockTracks: {},
        transceivers: [],
        eventListeners: new Map(),
      }

      this.pool.set(connectionId, pooledConnection)
      this.logger.info(`Returned connection ${connectionId} to pool`)
      this.metrics.returns++
      this.updateMetricCounts()
    } catch (error) {
      this.logger.error(`Failed to return connection ${connectionId}:`, error)
      try {
        pc.close()
      } catch (e) {
        // Ignore close errors
      }
      // Replenish pool since we failed to return
      this.replenishPool().catch((err) => {
        this.logger.error('Failed to replenish after return error:', err)
      })
    }
  }

  /**
   * Clean up the manager and all connections
   */
  cleanup(): void {
    this.logger.info('Cleaning up RTCPeerConnectionManager')

    // Stop maintenance worker
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = undefined
    }

    // Close all pooled connections
    for (const [, conn] of this.pool.entries()) {
      this.closeConnection(conn)
    }

    // Close all in-use connections
    for (const [pc, id] of this.inUseConnections.entries()) {
      this.logger.debug(`Closing in-use connection ${id}`)
      try {
        pc.close()
      } catch (e) {
        // Ignore close errors
      }
    }

    this.pool.clear()
    this.inUseConnections.clear()
  }

  /**
   * Create a new pooled connection with pre-gathered ICE candidates
   */
  private async createPooledConnection(retryCount = 0): Promise<PooledConnection | null> {
    // Check circuit breaker
    if (this.circuitBreakerState === 'open') {
      this.logger.warn('Circuit breaker is open, skipping connection creation')
      throw new PoolError(
        'Circuit breaker open - too many failures',
        false,
        'CIRCUIT_OPEN'
      )
    }

    try {
      const pc = RTCPeerConnection(this.config)
      const id = `conn_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 11)}`

      this.logger.debug(`Creating pooled connection ${id}`)

      // Add mock tracks to trigger ICE gathering
      const audioTrack = createMockAudioTrack()
      const videoTrack = createMockVideoTrack() // May be null on Safari

      const transceivers: RTCRtpTransceiver[] = []

      // Use addTransceiver for audio to create proper transceiver
      // Note: We pass the track to set up the sender, direction controls send/receive capability
      const audioTransceiver = pc.addTransceiver(audioTrack, {
        direction: 'sendrecv',
      })
      transceivers.push(audioTransceiver)

      // Add video transceiver if video track is available (not Safari)
      let videoTransceiver: RTCRtpTransceiver | null = null
      if (videoTrack) {
        videoTransceiver = pc.addTransceiver(videoTrack, {
          direction: 'sendrecv',
        })
        transceivers.push(videoTransceiver)
      }

      // Create offer to start ICE gathering
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      })
      await pc.setLocalDescription(offer)

      // Wait for ICE gathering to complete
      await this.waitForIceGathering(pc)

      // IMPORTANT: Do NOT rollback! We need to keep the local description
      // with the ICE candidates. The connection will be in have-local-offer state
      // but that's fine - when we use it for a real call, we'll create a new offer
      // which will replace this one while preserving the gathered ICE candidates.
      this.logger.debug(`Connection ${id} has ICE candidates gathered in offer`)

      // Create pooled connection object
      const pooledConnection: PooledConnection = {
        id,
        pc,
        createdAt: Date.now(),
        lastRefreshed: Date.now(),
        iceGatheringComplete: true,
        mockTracks: {
          audio: audioTrack,
          video: videoTrack || undefined,
        },
        transceivers,
        eventListeners: new Map(),
      }

      this.logger.debug(`Pooled connection ${id} created successfully`)
      this.logger.debug(`Connection state: ${pc.connectionState}`)
      this.logger.debug(`Signaling state: ${pc.signalingState}`)
      this.logger.debug(`ICE gathering state: ${pc.iceGatheringState}`)
      this.logger.debug(
        `ICE candidates gathered: ${pc.localDescription ? 'YES' : 'NO'}`
      )

      // Update metrics
      this.metrics.totalCreated++

      // Reset circuit breaker on success
      if (this.circuitBreakerState === 'half-open') {
        this.logger.info('Circuit breaker reset to closed after successful creation')
        this.circuitBreakerState = 'closed'
        this.circuitBreakerFailures = 0
      }

      return pooledConnection
    } catch (error) {
      this.logger.error(`Failed to create pooled connection (attempt ${retryCount + 1}):`, error)

      // Retry with exponential backoff
      if (retryCount < this.maxIceRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000) // Max 5s delay
        this.logger.info(`Retrying connection creation in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.createPooledConnection(retryCount + 1)
      }

      // Track final failure
      this.metrics.failures++

      // Update circuit breaker
      this.handleCircuitBreakerFailure()

      return null
    }
  }

  /**
   * Handle circuit breaker failure
   */
  private handleCircuitBreakerFailure(): void {
    this.circuitBreakerFailures++

    if (this.circuitBreakerFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      this.logger.error('Circuit breaker opening due to excessive failures')
      this.circuitBreakerState = 'open'

      // Schedule circuit breaker reset
      if (this.circuitBreakerResetTimer) {
        clearTimeout(this.circuitBreakerResetTimer)
      }

      this.circuitBreakerResetTimer = setTimeout(() => {
        this.logger.info('Circuit breaker entering half-open state')
        this.circuitBreakerState = 'half-open'
        this.circuitBreakerResetTimer = undefined
      }, CIRCUIT_BREAKER_RESET_TIME)
    }
  }

  /**
   * Update current metric counts
   */
  private updateMetricCounts(): void {
    this.metrics.currentPoolSize = this.pool.size
    this.metrics.inUseCount = this.inUseConnections.size

    // Calculate average connection age
    if (this.pool.size > 0) {
      const now = Date.now()
      let totalAge = 0
      for (const conn of this.pool.values()) {
        totalAge += now - conn.createdAt
      }
      this.metrics.avgConnectionAge = totalAge / this.pool.size
    }
  }

  /**
   * Get current pool metrics
   */
  getMetrics(): PoolMetrics {
    this.updateMetricCounts()
    return { ...this.metrics }
  }

  /**
   * Log current metrics
   */
  logMetrics(): void {
    const metrics = this.getMetrics()
    this.logger.info('Pool Metrics:', {
      hitRate: metrics.hits > 0 ?
        `${((metrics.hits / (metrics.hits + metrics.misses)) * 100).toFixed(2)}%` : '0%',
      ...metrics,
      avgConnectionAgeSeconds: (metrics.avgConnectionAge / 1000).toFixed(2),
    })
  }

  /**
   * Wait for ICE gathering to complete or timeout
   */
  private waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve()
        return
      }

      const onGatheringComplete = () => {
        if (pc.iceGatheringState === 'complete') {
          cleanup()
          resolve()
        }
      }

      const cleanup = () => {
        pc.removeEventListener('icegatheringstatechange', onGatheringComplete)
        clearTimeout(timer)
      }

      pc.addEventListener('icegatheringstatechange', onGatheringComplete)

      // Timeout after configured duration
      const timer = setTimeout(() => {
        this.logger.warn(`ICE gathering timeout after ${this.iceGatheringTimeout}ms, proceeding anyway`)
        cleanup()
        resolve()
      }, this.iceGatheringTimeout)
    })
  }

  /**
   * Verify that a track is properly stopped
   */
  private verifyTrackStopped(track: MediaStreamTrack): boolean {
    return track.readyState === 'ended'
  }

  /**
   * Clean up mock tracks and event listeners before handing off connection
   */
  private cleanupMockTracks(conn: PooledConnection): void {
    this.logger.debug(`Cleaning up mock tracks for connection ${conn.id}`)

    // Stop mock tracks first (important for cleanup)
    if (conn.mockTracks.audio) {
      cleanupMockAudioTrack(conn.mockTracks.audio)

      // Verify cleanup
      if (!this.verifyTrackStopped(conn.mockTracks.audio)) {
        this.logger.warn(`Audio track for ${conn.id} may not be properly stopped`)
        this.metrics.cleanupFailures++
        try {
          conn.mockTracks.audio.stop()
        } catch (e) {
          // Ignore if already stopped
        }
      }
    }
    if (conn.mockTracks.video) {
      cleanupMockVideoTrack(conn.mockTracks.video)

      // Verify cleanup
      if (!this.verifyTrackStopped(conn.mockTracks.video)) {
        this.logger.warn(`Video track for ${conn.id} may not be properly stopped`)
        this.metrics.cleanupFailures++
        try {
          conn.mockTracks.video.stop()
        } catch (e) {
          // Ignore if already stopped
        }
      }
    }

    // Clean up transceivers by stopping and removing mock tracks
    // Note: replaceTrack is async, but we need this to be synchronous
    // So we'll use a Promise to handle it properly
    const transceivers = conn.pc.getTransceivers()
    this.logger.debug(`Cleaning up ${transceivers.length} transceivers`)

    const cleanupPromises: Promise<void>[] = []

    for (let i = 0; i < transceivers.length; i++) {
      const transceiver = transceivers[i]
      if (transceiver.sender.track) {
        const trackKind = transceiver.sender.track.kind
        const trackId = transceiver.sender.track.id
        this.logger.debug(`Stopping ${trackKind} track (${trackId.substring(0, 8)}) on transceiver ${i}`)

        // First stop the track to release resources
        transceiver.sender.track.stop()

        // Schedule async replacement
        const promise = transceiver.sender.replaceTrack(null)
          .then(() => {
            this.logger.debug(`Successfully nullified track on transceiver ${i}`)
          })
          .catch((error) => {
            this.logger.warn(`Error replacing track with null on transceiver ${i}:`, error)
          })

        cleanupPromises.push(promise)
      }
    }

    // Fire and forget - the cleanup will happen async
    // The connection is still usable even with tracks being cleaned up
    Promise.all(cleanupPromises).then(() => {
      this.logger.debug(`All transceivers cleaned for connection ${conn.id}`)
    })

    // CRITICAL: Remove ALL event listeners to prevent conflicts with RTCPeer
    this.cleanupEventListeners(conn)

    // Clear references to prevent memory leaks
    conn.mockTracks = {}
    // Note: transceivers remain with the connection, just without tracks

    // The peer connection is now ready with:
    // - No active tracks
    // - ICE candidates still valid
    // - No event listeners (RTCPeer will add its own)
    // - Ready for real tracks to be added
  }

  /**
   * Remove all event listeners from RTCPeerConnection
   */
  private cleanupEventListeners(conn: PooledConnection): void {
    // Properly remove all tracked event listeners
    conn.eventListeners.forEach((listeners, eventName) => {
      listeners.forEach(listener => {
        conn.pc.removeEventListener(eventName, listener)
      })
    })
    conn.eventListeners.clear()

    // Also clear any inline event handlers
    const events = [
      'icecandidate',
      'icegatheringstatechange',
      'iceconnectionstatechange',
      'connectionstatechange',
      'signalingstatechange',
      'negotiationneeded',
      'track',
      'datachannel',
      'addstream',
      'removestream',
    ]

    events.forEach((event) => {
      // @ts-ignore - setting to null is valid
      conn.pc[`on${event}`] = null
    })
  }

  /**
   * Check if a pooled connection is still valid
   */
  private isConnectionValid(conn: PooledConnection): boolean {
    // Check if peer connection is in valid state
    if (
      conn.pc.connectionState === 'closed' ||
      conn.pc.connectionState === 'failed'
    ) {
      this.logger.debug(
        `Pooled connection ${conn.id} is not valid: ${conn.pc.connectionState}`
      )
      return false
    }

    // Check signaling state (should be stable after rollback)
    if (conn.pc.signalingState !== 'stable') {
      this.logger.debug(
        `Pooled connection ${conn.id} signalingState is not valid: ${conn.pc.signalingState}`
      )
      return false
    }

    // Check if ICE connection is still valid
    // Note: 'disconnected' state is temporary and connections can recover
    // Only reject 'failed' state which is permanent
    if (conn.pc.iceConnectionState === 'failed') {
      this.logger.debug(
        `Pooled connection ${conn.id} iceConnectionState is not valid: ${conn.pc.iceConnectionState}`
      )
      return false
    }

    // Check TURN allocation age (refresh every 4 minutes)
    const age = Date.now() - conn.lastRefreshed
    if (this.forceRefresh && age > this.turnRefreshInterval) {
      this.logger.debug(
        `Pooled connection ${conn.id} is not valid: TURN allocation age ${age}`
      )
      return false
    }

    return true
  }

  /**
   * Replenish the pool to maintain desired size
   */
  private async replenishPool(): Promise<void> {
    const needed = this.poolSize - this.pool.size

    if (needed <= 0) return

    this.logger.debug(`Replenishing pool with ${needed} connections`)

    // Create all needed connections in parallel
    const promises = Array(needed)
      .fill(null)
      .map(() => this.createPooledConnection())

    const connections = await Promise.all(promises)

    // Add successful connections to the pool
    connections.forEach((conn) => {
      if (conn) {
        this.pool.set(conn.id, conn)
      }
    })

    this.logger.debug(`Replenished pool with ${connections.filter(c => c !== null).length} connections`)
  }

  /**
   * Start the maintenance worker for TURN refresh
   */
  private startMaintenanceWorker(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }

    this.refreshTimer = setInterval(() => {
      this.refreshTurnAllocations().catch((err) => {
        this.logger.error('TURN refresh error:', err)
      })
    }, this.turnRefreshInterval)
  }

  /**
   * Manually refresh all connections (public method)
   */
  async refreshAllConnections(): Promise<void> {
    this.logger.info('Manually refreshing all pooled connections')
    await this.refreshTurnAllocations()
  }

  /**
   * Refresh TURN allocations for all pooled connections
   */
  private async refreshTurnAllocations(): Promise<void> {
    const now = Date.now()

    for (const [id, conn] of this.pool.entries()) {
      const age = now - conn.lastRefreshed

      // Refresh if older than 4 minutes (before automatic reallocation)
      if (age > this.turnRefreshInterval) {
        try {
          await this.refreshConnection(conn)
        } catch (error) {
          this.logger.error(`Failed to refresh connection ${id}:`, error)
          // Remove failed connection from pool
          this.pool.delete(id)
          this.closeConnection(conn)
        }
      }
    }

    // Replenish pool if needed after refresh
    this.replenishPool().catch((err) => {
      this.logger.error('Failed to replenish after refresh:', err)
    })
  }

  /**
   * Refresh a connection's TURN allocation using ICE restart
   */
  private async refreshConnection(conn: PooledConnection): Promise<void> {
    this.logger.debug(`Refreshing TURN allocation for connection ${conn.id}`)

    // ICE restart refreshes TURN allocations with new credentials
    conn.pc.restartIce()

    // Create new offer with iceRestart flag
    const offer = await conn.pc.createOffer({ iceRestart: true })
    await conn.pc.setLocalDescription(offer)

    // Wait for new ICE gathering (new candidates with new credentials)
    await this.waitForIceGathering(conn.pc)

    conn.lastRefreshed = Date.now()
    this.logger.debug(`TURN allocation refreshed for connection ${conn.id}`)
    this.logger.debug(
      `New ICE candidates for connection ${conn.id}:`,
      conn.pc.localDescription?.sdp
    )
  }

  /**
   * Close a connection and clean up resources
   */
  private closeConnection(conn: PooledConnection): void {
    try {
      // Clean up mock tracks
      if (conn.mockTracks.audio) {
        cleanupMockAudioTrack(conn.mockTracks.audio)
      }
      if (conn.mockTracks.video) {
        cleanupMockVideoTrack(conn.mockTracks.video)
      }

      // Close peer connection
      if (conn.pc.connectionState !== 'closed') {
        conn.pc.close()
      }
    } catch (error) {
      this.logger.error(`Error closing connection ${conn.id}:`, error)
    }
  }
}
