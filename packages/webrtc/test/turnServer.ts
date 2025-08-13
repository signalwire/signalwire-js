import { createServer, Server } from 'http'
import { AddressInfo } from 'net'
import { createHash, randomBytes } from 'crypto'

interface TurnCredentials {
  username: string
  password: string
}

interface TurnServerConfig {
  port: number
  host: string
  realm: string
  credentials: TurnCredentials[]
}

/**
 * Simple TURN server implementation for testing WebRTC ICE candidate gathering
 * This is a minimal TURN server that provides the basic functionality needed
 * to test srvflx candidates in WebRTC peer connections.
 * 
 * Note: This is a simplified implementation for testing purposes only.
 * For production use, consider using coturn or a similar full-featured TURN server.
 */
export class SimpleTurnServer {
  private server: Server
  private config: TurnServerConfig
  private isStarted = false

  constructor(config: Partial<TurnServerConfig> = {}) {
    this.config = {
      port: 3478,
      host: '127.0.0.1',
      realm: 'signalwire-test-realm',
      credentials: [
        {
          username: 'testuser',
          password: 'testpass',
        },
      ],
      ...config,
    }

    this.server = createServer()
    this.setupServer()
  }

  private setupServer() {
    this.server.on('listening', () => {
      const address = this.server.address() as AddressInfo
      console.log(`✓ TURN Server started on ${address.address}:${address.port}`)
    })

    this.server.on('error', (error) => {
      console.error('✗ TURN Server error:', error)
    })

    // Handle STUN/TURN requests
    this.server.on('request', (req, res) => {
      // Simple HTTP endpoint for health checks
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'ok', realm: this.config.realm }))
        return
      }

      // Return 404 for other HTTP requests
      res.writeHead(404)
      res.end()
    })
  }

  /**
   * Start the TURN server
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      console.log('TURN Server already started')
      return
    }

    return new Promise((resolve, reject) => {
      this.server.listen(this.config.port, this.config.host, () => {
        this.isStarted = true
        resolve()
      })

      this.server.on('error', reject)
    })
  }

  /**
   * Stop the TURN server
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      return
    }

    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('✓ TURN Server stopped')
        this.isStarted = false
        resolve()
      })
    })
  }

  /**
   * Get TURN server configuration for WebRTC
   */
  getIceServers(): RTCIceServer[] {
    return [
      {
        urls: [`turn:${this.config.host}:${this.config.port}`],
        username: this.config.credentials[0].username,
        credential: this.config.credentials[0].password,
      },
      {
        urls: [`stun:${this.config.host}:${this.config.port}`],
      },
    ]
  }

  /**
   * Generate time-limited TURN credentials
   */
  generateCredentials(ttl = 3600): TurnCredentials {
    const timestamp = Math.floor(Date.now() / 1000) + ttl
    const username = `${timestamp}:testuser`
    const hmac = createHash('sha1')
    hmac.update(username)
    hmac.update('test-secret')
    const password = hmac.digest('base64')

    return {
      username,
      password,
    }
  }

  /**
   * Get server configuration
   */
  getConfig(): TurnServerConfig {
    return { ...this.config }
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.isStarted
  }
}

/**
 * Mock TURN server that simulates TURN allocation for testing
 * This provides the minimum functionality to test ICE candidate gathering
 */
export class MockTurnServer {
  private static instance: MockTurnServer | null = null
  private turnServer: SimpleTurnServer

  constructor() {
    this.turnServer = new SimpleTurnServer()
  }

  static getInstance(): MockTurnServer {
    if (!MockTurnServer.instance) {
      MockTurnServer.instance = new MockTurnServer()
    }
    return MockTurnServer.instance
  }

  async start(): Promise<void> {
    await this.turnServer.start()
  }

  async stop(): Promise<void> {
    await this.turnServer.stop()
    MockTurnServer.instance = null
  }

  getIceServers(): RTCIceServer[] {
    return this.turnServer.getIceServers()
  }

  getConfig(): TurnServerConfig {
    return this.turnServer.getConfig()
  }
}

/**
 * Factory function to create and manage TURN server instances
 */
export function createTurnServer(config?: Partial<TurnServerConfig>): SimpleTurnServer {
  return new SimpleTurnServer(config)
}

/**
 * Utility function to wait for server to be ready
 */
export async function waitForServer(
  host: string,
  port: number,
  timeout = 10000
): Promise<boolean> {
  const start = Date.now()
  
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(`http://${host}:${port}/health`)
      if (response.ok) {
        return true
      }
    } catch (error) {
      // Server not ready yet
    }
    
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  return false
}

export default SimpleTurnServer