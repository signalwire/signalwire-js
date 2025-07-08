import {
  SagaIterator,
  sagaEffects,
  SDKWorker,
  selectors,
  getLogger,
} from '@signalwire/core'
import { RTCPeerConnectionManager } from '../RTCPeerConnectionManager'
import { filterIceServers } from '../utils/helpers'

const { call, select, take, cancelled } = sagaEffects

interface ConnectionPoolWorkerOptions {
  poolSize?: number
}

export const connectionPoolWorker: SDKWorker<ConnectionPoolWorkerOptions> = function* (
  options
): SagaIterator {
  const { instance } = options
  const poolSize = options.initialState?.poolSize || 3
  const logger = getLogger()
  let manager: RTCPeerConnectionManager | null = null

  try {
    logger.debug('connectionPoolWorker started')
    
    // Wait for ICE servers to be available
    let iceServers: RTCIceServer[] = yield select(selectors.getIceServers)

    if (!iceServers || iceServers.length === 0) {
      logger.debug('No ICE servers available yet, waiting for session.connected')
      
      // Wait for session.connected action which contains ICE servers
      const action = yield take('session/connected')
      iceServers = action.payload?.ice_servers || []
    }

    if (!iceServers || iceServers.length === 0) {
      logger.warn('No ICE servers available for connection pool')
      return
    }

    logger.info('ICE servers available, initializing connection pool')

    // Build RTCConfiguration same way as RTCPeer
    const rtcPeerConfig = (instance as any).options?.rtcPeerConfig || {}
    const config: RTCConfiguration = {
      bundlePolicy: 'max-compat',
      iceServers: filterIceServers(iceServers, {
        disableUdpIceServers: (instance as any).options?.disableUdpIceServers,
      }),
      // @ts-ignore - sdpSemantics is valid but not in TS types
      sdpSemantics: 'unified-plan',
      iceCandidatePoolSize: (instance as any).options?.iceCandidatePoolSize || 10,
      ...rtcPeerConfig, // Must be last to allow override
    }

    // Create and initialize the manager
    manager = new RTCPeerConnectionManager(
      config,
      (instance as any).options?.connectionPoolSize || poolSize
    )
    
    yield call([manager, manager.initializePool])

    // Store manager reference on instance for RTCPeer to access
    // @ts-ignore - dynamic property
    instance._connectionManager = manager

    logger.info('Connection pool initialized successfully')

    // Keep worker running until cancelled
    while (true) {
      // This action never dispatches, keeps worker alive
      yield take('CONNECTION_POOL_WORKER_KEEP_ALIVE')
    }
  } catch (error) {
    logger.error('connectionPoolWorker error:', error)
  } finally {
    if (yield cancelled()) {
      logger.debug('connectionPoolWorker cancelled, cleaning up')
      if (manager) {
        manager.cleanup()
        // @ts-ignore - dynamic property
        delete instance._connectionManager
      }
    }
  }
}