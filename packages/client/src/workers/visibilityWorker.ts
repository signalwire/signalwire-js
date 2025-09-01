import {
  getLogger,
  SDKWorker,
  SDKWorkerParams,
  SagaIterator,
  sagaEffects,
  Task,
} from '@signalwire/core'
import type { EventChannel } from '@redux-saga/core'
const { fork, take, call, cancel, cancelled, delay } = sagaEffects

import {
  VisibilityManager,
  VisibilityEvent,
  VisibilityConfig,
  RecoveryStrategy,
  createCombinedVisibilityChannel,
  executeRecoveryStrategies,
  MobileOptimizationManager,
  DeviceManager,
  createDeviceManager,
} from '../visibility'
import type { BaseRoomSession } from '../BaseRoomSession'
import type { VideoRoomSession } from '../video/VideoRoomSession'
import type { CallSession } from '../unified/CallSession'

export interface VisibilityWorkerParams {
  instance: BaseRoomSession<any> | VideoRoomSession | CallSession
  visibilityConfig?: VisibilityConfig
}

interface VisibilityWorkerState {
  manager: VisibilityManager | null
  mobileManager: MobileOptimizationManager | null
  deviceManager: DeviceManager | null
  eventChannel: EventChannel<VisibilityEvent> | null
  isVisible: boolean
  hasFocus: boolean
  mediaState: {
    audioMuted: boolean
    videoMuted: boolean
    screenShareActive: boolean
  }
}

const RECOVERY_DELAY = 1000 // 1 second delay before recovery
const MAX_RECOVERY_ATTEMPTS = 3

/**
 * Visibility Worker
 * Handles browser visibility changes and manages recovery strategies
 */
export const visibilityWorker: SDKWorker<any> = function* (
  options: SDKWorkerParams<any> & { initialArgs?: VisibilityWorkerParams }
): SagaIterator {
  // Extract custom parameters from initialArgs (passed via runWorker definition)
  const { initialArgs } = options
  const { instance, visibilityConfig } = (initialArgs || {}) as VisibilityWorkerParams
  const logger = getLogger()

  // Initialize state
  const state: VisibilityWorkerState = {
    manager: null,
    mobileManager: null,
    deviceManager: null,
    eventChannel: null,
    isVisible: true,
    hasFocus: true,
    mediaState: {
      audioMuted: false,
      videoMuted: false,
      screenShareActive: false,
    },
  }

  // Worker task references
  let visibilityTask: Task | null = null
  let recoveryTask: Task | null = null

  try {
    logger.debug('Starting visibility worker')

    // Initialize visibility manager if config is provided
    if (visibilityConfig && visibilityConfig.enabled !== false) {
      // VisibilityManager constructor expects an instance and config
      state.manager = new VisibilityManager(instance as any, visibilityConfig)
      
      // Initialize mobile optimization if enabled
      if ('mobileOptimization' in visibilityConfig && visibilityConfig.mobileOptimization) {
        state.mobileManager = new MobileOptimizationManager(visibilityConfig)
      }

      // Initialize device management if enabled
      if ('deviceManagement' in visibilityConfig && visibilityConfig.deviceManagement) {
        const deviceManagerTarget = {
          id: instance.id || 'default',
          // Add other required properties if needed
        }
        state.deviceManager = yield call(createDeviceManager as any, 
          deviceManagerTarget,
          visibilityConfig
        )
      }

      // Create visibility event channel
      state.eventChannel = yield call(createCombinedVisibilityChannel as any)

      // Start visibility monitoring
      visibilityTask = yield fork(handleVisibilityEvents, state, instance, logger)
    }

    // Wait for cleanup signal
    yield take(['roomSession.leaving', 'roomSession.left'])

  } catch (error) {
    logger.error('Visibility worker error:', error)
  } finally {
    // Cleanup on worker termination
    if (cancelled()) {
      logger.debug('Visibility worker cancelled, cleaning up')
      
      // Cancel tasks
      if (visibilityTask) yield cancel(visibilityTask)
      if (recoveryTask) yield cancel(recoveryTask)

      // Cleanup managers
      if (state.manager) {
        state.manager.destroy()
      }
      if (state.mobileManager) {
        state.mobileManager.destroy()
      }
      if (state.deviceManager) {
        // DeviceManager cleanup (if it has a destroy method)
        if ('destroy' in state.deviceManager) {
          (state.deviceManager as any).destroy()
        }
      }
      if (state.eventChannel) {
        state.eventChannel.close()
      }
    }
  }
}

/**
 * Handle visibility events from the browser
 */
function* handleVisibilityEvents(
  state: VisibilityWorkerState,
  instance: any,
  logger: any
): SagaIterator {
  if (!state.eventChannel) return

  try {
    while (true) {
      const event: VisibilityEvent = yield take(state.eventChannel)
      
      logger.debug('Visibility event received:', event)

      // Update state based on event type
      switch (event.type) {
        case 'visibility':
          const visEvent = event as any
          state.isVisible = visEvent.isVisible
          if (!visEvent.isVisible) {
            yield fork(handleVisibilityLost, state, instance, logger)
          } else {
            yield fork(handleVisibilityRestored, state, instance, logger)
          }
          break

        case 'focus':
          const focusEvent = event as any
          if (focusEvent.hasFocus) {
            state.hasFocus = true
            yield fork(handleFocusGained, state, instance, logger)
          } else {
            state.hasFocus = false
            yield fork(handleFocusLost, state, instance, logger)
          }
          break

        case 'pageshow':
          const showEvent = event as any
          if (showEvent.persisted) {
            // Page restored from cache
            yield fork(handlePageRestored, state, instance, logger)
          }
          break

        case 'pagehide':
          const hideEvent = event as any
          if (hideEvent.persisted) {
            // Page being cached
            yield fork(handlePageCached, state, instance, logger)
          }
          break

        case 'devicechange':
          yield fork(handleDeviceChange, state, instance, event, logger)
          break

        case 'wake':
          yield fork(handleDeviceWake, state, instance, logger)
          break
      }

      // Emit event on the instance for application handling
      if (instance.emit) {
        instance.emit(`visibility.${event.type}`, event)
      }
    }
  } catch (error) {
    logger.error('Error handling visibility events:', error)
  }
}

/**
 * Handle when visibility is lost (tab hidden)
 */
function* handleVisibilityLost(
  state: VisibilityWorkerState,
  instance: any,
  logger: any
): SagaIterator {
  logger.info('Visibility lost, preparing for background mode')

  try {
    // Save current media state
    state.mediaState = {
      audioMuted: instance.audioMuted || false,
      videoMuted: instance.videoMuted || false,
      screenShareActive: instance.screenShareList?.length > 0 || false,
    }

    // Apply mobile optimizations if available
    if (state.mobileManager) {
      yield call([state.mobileManager, 'handleVisibilityChange'] as any, false)
    }

    // Notify application
    if (instance.emit) {
      instance.emit('visibility.lost', { mediaState: state.mediaState })
    }
  } catch (error) {
    logger.error('Error handling visibility lost:', error)
  }
}

/**
 * Handle when visibility is restored (tab visible)
 */
function* handleVisibilityRestored(
  state: VisibilityWorkerState,
  instance: any,
  logger: any
): SagaIterator {
  logger.info('Visibility restored, initiating recovery')

  try {
    // Wait a bit for browser to stabilize
    yield delay(RECOVERY_DELAY)

    // Execute recovery strategies based on session type
    const strategies = getRecoveryStrategiesForSession(instance)
    
    const recoveryResult = yield call(executeRecoveryStrategies as any, {
      strategies,
      context: {
        instance,
        mediaState: state.mediaState,
        isVideoRoom: isVideoRoomSession(instance),
        isCallFabric: isCallSession(instance),
      },
      maxAttempts: MAX_RECOVERY_ATTEMPTS,
    })

    // Apply mobile optimizations if available
    if (state.mobileManager) {
      yield call([state.mobileManager, 'handleVisibilityChange'] as any, true)
    }

    // Notify application
    if (instance.emit) {
      instance.emit('visibility.restored', {
        mediaState: state.mediaState,
        recoveryResult,
      })
    }

    logger.info('Recovery completed:', recoveryResult)
  } catch (error) {
    logger.error('Error during visibility recovery:', error)
  }
}

/**
 * Handle focus gained event
 */
function* handleFocusGained(
  state: VisibilityWorkerState,
  instance: any,
  logger: any
): SagaIterator {
  logger.debug('Focus gained')
  
  // Light recovery for focus events
  if (state.isVisible) {
    yield call(executeRecoveryStrategies as any, {
      strategies: [RecoveryStrategy.KeyframeRequest],
      context: { instance },
      maxAttempts: 1,
    })
  }
}

/**
 * Handle focus lost event
 */
function* handleFocusLost(
  _state: VisibilityWorkerState,
  _instance: any,
  logger: any
): SagaIterator {
  logger.debug('Focus lost')
  // Generally no action needed on focus lost
}

/**
 * Handle page restored from cache
 */
function* handlePageRestored(
  state: VisibilityWorkerState,
  instance: any,
  logger: any
): SagaIterator {
  logger.info('Page restored from cache, full recovery needed')
  
  // Full recovery for cached pages
  yield call(handleVisibilityRestored, state, instance, logger)
}

/**
 * Handle page being cached
 */
function* handlePageCached(
  state: VisibilityWorkerState,
  instance: any,
  logger: any
): SagaIterator {
  logger.info('Page being cached')
  
  // Prepare for caching
  yield call(handleVisibilityLost, state, instance, logger)
}

/**
 * Handle device change event
 */
function* handleDeviceChange(
  state: VisibilityWorkerState,
  instance: any,
  event: any,
  logger: any
): SagaIterator {
  logger.info('Device change detected:', event.changeInfo)

  try {
    if (state.deviceManager) {
      const result = yield call(
        [state.deviceManager, 'handleDeviceChange'],
        event.changeInfo
      )
      
      if (result.needsRecovery) {
        yield call(executeRecoveryStrategies as any, {
          strategies: [RecoveryStrategy.StreamReconnection],
          context: { instance },
          maxAttempts: 2,
        })
      }
    }
  } catch (error) {
    logger.error('Error handling device change:', error)
  }
}

/**
 * Handle device wake event
 */
function* handleDeviceWake(
  state: VisibilityWorkerState,
  instance: any,
  logger: any
): SagaIterator {
  logger.info('Device wake detected')
  
  // Full recovery after device wake
  yield call(handleVisibilityRestored, state, instance, logger)
}

/**
 * Get recovery strategies based on session type
 */
function getRecoveryStrategiesForSession(instance: any): RecoveryStrategy[] {
  const strategies: RecoveryStrategy[] = []

  // Common strategies
  strategies.push(RecoveryStrategy.VideoPlay)
  strategies.push(RecoveryStrategy.KeyframeRequest)

  // Video room specific
  if (isVideoRoomSession(instance)) {
    strategies.push(RecoveryStrategy.LayoutRefresh)
  }

  // Call fabric specific
  if (isCallSession(instance)) {
    strategies.push(RecoveryStrategy.StreamReconnection)
    strategies.push(RecoveryStrategy.Reinvite)
    
    // Additional recovery for call fabric
    // Check if connection needs recovery
    const anyInstance = instance as any
    if (anyInstance.peer?.instance) {
      const { connectionState } = anyInstance.peer.instance
      if (['closed', 'failed', 'disconnected'].includes(connectionState)) {
        // Trigger resume for Call Fabric
        strategies.push(RecoveryStrategy.CallFabricResume)
      }
    }
  }

  return strategies
}

/**
 * Type guards for session types
 */
function isVideoRoomSession(instance: any): instance is VideoRoomSession {
  return instance.constructor.name === 'VideoRoomSessionAPI' ||
         instance.constructor.name === 'VideoRoomSessionConnection'
}

function isCallSession(instance: any): instance is CallSession {
  return instance.constructor.name === 'CallSessionConnection' ||
         instance.constructor.name === 'CallSession'
}
