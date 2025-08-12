import { getLogger } from '@signalwire/core'
import { RTCPeerConnection } from './utils/primitives'
import {
  createMockAudioTrack,
  createMockVideoTrack,
  cleanupMockAudioTrack,
  cleanupMockVideoTrack,
} from './utils/mockTracks'

const maxPoolSize = 4
const maxIceCandidatePoolSize = 20

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
  senders: RTCRtpSender[]
}

export class RTCPeerConnectionManager {
  private pool: Map<string, PooledConnection> = new Map()
  private config: RTCConfiguration
  private poolSize: number
  private forceRefresh: boolean
  private turnRefreshInterval: number = 240000 // 4 minutes
  private refreshTimer?: ReturnType<typeof setInterval>
  private logger = getLogger()

  constructor(config: RTCConfiguration, poolSize = 3, forceRefresh = false) {
    const iceCandidatePoolSize = config.iceCandidatePoolSize || 10
    this.config = {
      ...config,
      // Ensure iceCandidatePoolSize is set for candidate reuse
      iceCandidatePoolSize:
        iceCandidatePoolSize > maxIceCandidatePoolSize
          ? maxIceCandidatePoolSize
          : iceCandidatePoolSize,
    }
    this.poolSize = poolSize > maxPoolSize ? maxPoolSize : poolSize
    this.forceRefresh = forceRefresh
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
        'Manual force refresh mode enabled, TURN allocations will not be refreshed by this manager.'
      )
      // Start maintenance worker for TURN refresh
      this.startMaintenanceWorker()
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
      if (this.isConnectionValid(conn)) {
        this.logger.info(`Providing pooled connection ${id}`)

        // Remove from pool
        this.pool.delete(id)

        // Clean up mock tracks completely before returning
        this.cleanupMockTracks(conn)

        // Replenish pool in background
        this.replenishPool().catch((err) => {
          this.logger.error('Failed to replenish pool:', err)
        })

        // Return clean RTCPeerConnection ready for use
        return conn.pc
      }
    }

    this.logger.warn('No valid pooled connections available')
    return null
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

    // Close all connections
    for (const [, conn] of this.pool.entries()) {
      this.closeConnection(conn)
    }

    this.pool.clear()
  }

  /**
   * Create a new pooled connection with pre-gathered ICE candidates
   */
  private async createPooledConnection(): Promise<PooledConnection | null> {
    try {
      const pc = RTCPeerConnection(this.config)
      const id = `conn_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 11)}`

      this.logger.debug(`Creating pooled connection ${id}`)

      // Add mock tracks to trigger ICE gathering
      const audioTrack = createMockAudioTrack()
      const videoTrack = createMockVideoTrack() // May be null on Safari

      const senders: RTCRtpSender[] = []

      // Add audio track
      const audioSender = pc.addTrack(audioTrack)
      senders.push(audioSender)

      // Add video track if available (not Safari)
      let videoSender: RTCRtpSender | null = null
      if (videoTrack) {
        videoSender = pc.addTrack(videoTrack)
        senders.push(videoSender)
      }

      // Create offer to start ICE gathering
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      })
      await pc.setLocalDescription(offer)

      // Wait for ICE gathering to complete
      await this.waitForIceGathering(pc)

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
        senders,
      }

      this.logger.debug(`Pooled connection ${id} created successfully`)
      this.logger.debug(
        `ICE candidates gathered for connection ${id}:`,
        pc.localDescription?.sdp
      )
      return pooledConnection
    } catch (error) {
      this.logger.error('Failed to create pooled connection:', error)
      return null
    }
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

      // Timeout after 10 seconds
      const timer = setTimeout(() => {
        this.logger.warn('ICE gathering timeout, proceeding anyway')
        cleanup()
        resolve()
      }, 10000)
    })
  }

  /**
   * Clean up mock tracks and event listeners before handing off connection
   */
  private cleanupMockTracks(conn: PooledConnection): void {
    this.logger.debug(`Cleaning up mock tracks for connection ${conn.id}`)

    // Stop mock tracks first (important for cleanup)
    if (conn.mockTracks.audio) {
      cleanupMockAudioTrack(conn.mockTracks.audio)
    }
    if (conn.mockTracks.video) {
      cleanupMockVideoTrack(conn.mockTracks.video)
    }

    // Remove senders from peer connection
    // Note: removeTrack sets sender.track to null but keeps sender in getSenders()
    conn.senders.forEach((sender) => {
      try {
        conn.pc.removeTrack(sender)
      } catch (error) {
        this.logger.warn('Error removing track:', error)
      }
    })

    // CRITICAL: Remove ALL event listeners to prevent conflicts with RTCPeer
    this.cleanupEventListeners(conn.pc)

    // Clear references to prevent memory leaks
    conn.mockTracks = {}
    conn.senders = []

    // The peer connection is now ready with:
    // - No active tracks
    // - ICE candidates still valid
    // - No event listeners (RTCPeer will add its own)
    // - Ready for real tracks to be added
  }

  /**
   * Remove all event listeners from RTCPeerConnection
   */
  private cleanupEventListeners(pc: RTCPeerConnection): void {
    // Remove all possible event listeners by setting handlers to null
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
      // This removes all listeners for each event type
      // @ts-ignore - setting to null is valid
      pc[`on${event}`] = null
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

    // Check signaling state (must be stable for reuse)
    if (conn.pc.signalingState === 'closed') {
      this.logger.debug(
        `Pooled connection ${conn.id} signalingState is not valid: ${conn.pc.signalingState}`
      )
      return false
    }

    // Check if ICE connection is still valid
    if (
      conn.pc.iceConnectionState === 'failed' ||
      conn.pc.iceConnectionState === 'disconnected'
    ) {
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

    for (let i = 0; i < needed; i++) {
      const conn = await this.createPooledConnection()
      if (conn) {
        this.pool.set(conn.id, conn)
      }
    }
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
