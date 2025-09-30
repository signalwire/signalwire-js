import { getLogger } from '@signalwire/core'
import { RTCPeerConnectionManager } from './RTCPeerConnectionManager'

class ConnectionPoolManagerSingleton {
  private manager?: RTCPeerConnectionManager
  private logger = getLogger()
  

  async initializePool(
    iceServers: RTCIceServer[],
    options: {
      poolSize?: number
      iceCandidatePoolSize?: number
    } = {}
  ): Promise<void> {
    if (this.manager) {
      this.logger.warn('Connection pool already initialized')
      return
    }

    this.logger.info('Initializing connection pool')

    const rtcConfig: RTCConfiguration = {
      iceServers,
      iceCandidatePoolSize: options.iceCandidatePoolSize ?? 10,
    }
    
    this.manager = new RTCPeerConnectionManager(
      rtcConfig,
      options.poolSize ?? 3  // Increased default from 2 to 3
    )

    await this.manager.initializePool()
  }

  getConnection(): RTCPeerConnection | null {
    if (!this.manager) {
      this.logger.warn('Connection pool not initialized')
      return null
    }
    return this.manager.getConnection()
  }

  returnConnection(pc: RTCPeerConnection): void {
    if (!this.manager) {
      this.logger.warn('Connection pool not initialized, cannot return connection')
      return
    }
    this.manager.returnConnection(pc)
  }

  cleanup(): void {
    if (this.manager) {
      this.logger.info('Cleaning up connection pool')
      this.manager.cleanup()
      this.manager = undefined
    }
  }

  get isInitialized(): boolean {
    return !!this.manager
  }
}

// Export singleton instance
export const connectionPoolManager = new ConnectionPoolManagerSingleton()