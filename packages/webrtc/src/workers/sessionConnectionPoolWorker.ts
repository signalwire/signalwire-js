import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  actions,
} from '@signalwire/core'
import { connectionPoolManager } from '../connectionPoolManager'

export interface SessionConnectionPoolWorkerOptions {
  poolSize?: number
  iceCandidatePoolSize?: number
}

export const sessionConnectionPoolWorker: SDKWorker<SessionConnectionPoolWorkerOptions> =
  function* (options): SagaIterator {
    const logger = getLogger()
    logger.debug('sessionConnectionPoolWorker started')

    const poolOptions = options.initialState || {}

    try {
      // Wait for session.connected action which contains ICE servers
      logger.debug('Waiting for session/connected action')
      const action = yield sagaEffects.take('session/connected')

      const iceServers = action.payload?.ice_servers || []

      if (!iceServers || iceServers.length === 0) {
        logger.warn(
          'No ICE servers available, cannot initialize connection pool'
        )
        return
      }

      logger.info('Session authorized, initializing connection pool')

      // Initialize the connection pool
      yield sagaEffects.call(
        [connectionPoolManager, connectionPoolManager.initializePool],
        iceServers,
        poolOptions
      )

      logger.info('Connection pool initialized successfully')

      // Keep worker running until session disconnects
      yield sagaEffects.take(actions.sessionDisconnectedAction.type)

      logger.info('Session disconnected, cleaning up connection pool')
      yield sagaEffects.call([
        connectionPoolManager,
        connectionPoolManager.cleanup,
      ])
    } catch (error) {
      logger.error('Error in sessionConnectionPoolWorker', error)
    } finally {
      logger.debug('sessionConnectionPoolWorker ended')
    }
  }
