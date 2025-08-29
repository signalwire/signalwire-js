/**
 * WebRTC Stats Monitor Worker
 * 
 * Redux saga worker that orchestrates WebRTC stats monitoring events
 * and integrates with the SDK's event-driven architecture.
 */

import {
  getLogger,
  sagaEffects,
  SagaIterator,
  SDKWorker,
  actions,
  Task,
} from '@signalwire/core'
import { eventChannel, END } from '@redux-saga/core'
import { WebRTCStatsMonitor } from '../monitoring/WebRTCStatsMonitor'
import { 
  NetworkQualityChangedEvent,
  NetworkIssueDetectedEvent,
  RecoveryAttemptedEvent,
  MonitoringOptions,
} from '../monitoring/interfaces'

export interface StatsMonitorWorkerOptions {
  enabled?: boolean
  pollInterval?: number
  enableAutoRecovery?: boolean
  preset?: 'strict' | 'balanced' | 'relaxed'
  thresholds?: Partial<MonitoringOptions['thresholds']>
}

/**
 * Creates an event channel for monitoring events
 */
function createMonitoringChannel(monitor: WebRTCStatsMonitor) {
  return eventChannel((emitter: (action: any) => void) => {
    const handlers = {
      'network.quality.changed': (event: NetworkQualityChangedEvent) => {
        emitter({ type: 'monitoring/networkQualityChanged', payload: event })
      },
      'network.issue.detected': (event: NetworkIssueDetectedEvent) => {
        emitter({ type: 'monitoring/issueDetected', payload: event })
      },
      'network.recovery.attempted': (event: RecoveryAttemptedEvent) => {
        emitter({ type: 'monitoring/recoveryAttempted', payload: event })
      },
      'monitoring.started': () => {
        emitter({ type: 'monitoring/started' })
      },
      'monitoring.stopped': () => {
        emitter({ type: 'monitoring/stopped' })
        emitter(END)
      },
    }

    // Subscribe to monitor events
    Object.entries(handlers).forEach(([event, handler]) => {
      monitor.on(event as any, handler as any)
    })

    // Cleanup function
    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        monitor.off(event as any, handler as any)
      })
    }
  })
}

/**
 * Stats Monitor Worker - Orchestrates WebRTC monitoring within Redux saga
 */
export const statsMonitorWorker: SDKWorker<StatsMonitorWorkerOptions> = function* (
  options
): SagaIterator {
  const logger = getLogger()
  logger.debug('statsMonitorWorker started', { options })

  const workerOptions = options.initialState || {}
  
  // Skip if monitoring is explicitly disabled
  if (workerOptions.enabled === false) {
    logger.info('Stats monitoring is disabled')
    return
  }

  let monitor: WebRTCStatsMonitor | null = null
  let monitoringTask: Task | null = null

  try {
    // Wait for WebRTC peer connection to be established
    logger.debug('Waiting for WebRTC peer connection')
    const peerAction = yield sagaEffects.take([
      'webrtc/peerConnectionEstablished',
      'rtcPeer/started',
    ])

    const { peer, peerConnection } = peerAction.payload || {}
    
    if (!peer || !peerConnection) {
      logger.warn('No peer connection available, cannot start monitoring')
      return
    }

    logger.info('Peer connection established, initializing stats monitor')

    // Create monitor instance
    monitor = new WebRTCStatsMonitor(peer, peer.call)
    
    // Configure monitor with options
    if (workerOptions.preset) {
      monitor.usePreset(workerOptions.preset)
    }
    
    if (workerOptions.thresholds) {
      monitor.setThresholds(workerOptions.thresholds)
    }

    if (workerOptions.pollInterval) {
      monitor.updateOptions({ interval: workerOptions.pollInterval })
    }

    if (workerOptions.enableAutoRecovery !== undefined) {
      monitor.updateOptions({ autoRecover: workerOptions.enableAutoRecovery })
    }

    // Create event channel for monitoring events
    const monitoringChannel = createMonitoringChannel(monitor)

    // Start monitoring task
    monitoringTask = yield sagaEffects.fork(function* (): SagaIterator {
      try {
        while (true) {
          const event = yield sagaEffects.take(monitoringChannel)
          
          // Dispatch monitoring events to Redux store
          yield sagaEffects.put(event)
          
          // Handle specific event types
          switch (event.type) {
            case 'monitoring/networkQualityChanged':
              logger.debug('Network quality changed', event.payload)
              // Emit to application layer
              yield sagaEffects.put({
                type: 'webrtc/networkQualityChanged',
                payload: event.payload,
              })
              break
              
            case 'monitoring/issueDetected':
              logger.warn('Network issue detected', event.payload)
              // Trigger recovery if auto-recovery is enabled
              if (workerOptions.enableAutoRecovery !== false) {
                yield sagaEffects.put({
                  type: 'webrtc/requestRecovery',
                  payload: { issues: event.payload.issues },
                })
              }
              break
              
            case 'monitoring/recoveryAttempted':
              logger.info('Recovery attempted', event.payload)
              break
          }
        }
      } finally {
        logger.debug('Monitoring channel closed')
      }
    })

    // Start the monitor
    monitor.start()
    logger.info('Stats monitoring started successfully')

    // Listen for manual control actions
    while (true) {
      const action = yield sagaEffects.take([
        'monitoring/requestStart',
        'monitoring/requestStop',
        'monitoring/requestRecovery',
        'monitoring/updateThresholds',
        'session/disconnected',
        actions.sessionDisconnectedAction.type,
      ])

      switch (action.type) {
        case 'monitoring/requestStart':
          if (monitor && !monitor.isMonitoring()) {
            logger.info('Starting monitoring on request')
            monitor.start()
          }
          break
          
        case 'monitoring/requestStop':
          if (monitor && monitor.isMonitoring()) {
            logger.info('Stopping monitoring on request')
            monitor.stop()
          }
          break
          
        case 'monitoring/requestRecovery':
          if (monitor) {
            const { type = 'auto' } = action.payload || {}
            logger.info('Manual recovery requested', { type })
            yield sagaEffects.call([monitor, monitor.triggerRecovery], type)
          }
          break
          
        case 'monitoring/updateThresholds':
          if (monitor) {
            const { thresholds } = action.payload || {}
            logger.info('Updating monitoring thresholds', { thresholds })
            monitor.setThresholds(thresholds)
          }
          break
          
        case 'session/disconnected':
        case actions.sessionDisconnectedAction.type:
          logger.info('Session disconnected, stopping monitoring')
          if (monitor) {
            monitor.stop()
          }
          return
      }
    }
  } catch (error) {
    logger.error('Stats monitor worker error', error)
    throw error
  } finally {
    // Cleanup
    if (monitoringTask) {
      yield sagaEffects.cancel(monitoringTask)
    }
    
    if (monitor) {
      logger.info('Cleaning up stats monitor')
      monitor.stop()
      monitor.destroy()
    }
    
    logger.debug('statsMonitorWorker ended')
  }
}

// Export helper action creators
export const monitoringActions = {
  requestStart: () => ({ type: 'monitoring/requestStart' as const }),
  requestStop: () => ({ type: 'monitoring/requestStop' as const }),
  requestRecovery: (type?: string) => ({ 
    type: 'monitoring/requestRecovery' as const,
    payload: { type },
  }),
  updateThresholds: (thresholds: any) => ({ 
    type: 'monitoring/updateThresholds' as const,
    payload: { thresholds },
  }),
}