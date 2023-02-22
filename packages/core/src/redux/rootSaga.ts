import type { Task, SagaIterator } from '@redux-saga/types'
import { fork, call, take, put, all, cancelled } from '@redux-saga/core/effects'
import { InternalUserOptions, InternalChannels } from '../utils/interfaces'
import { getLogger, setDebugOptions, setLogger } from '../utils'
import { BaseSession } from '../BaseSession'
import { sessionChannelWatcher } from './features/session/sessionSaga'
import { pubSubSaga } from './features/pubSub/pubSubSaga'
import {
  initAction,
  destroyAction,
  sessionReconnectingAction,
  sessionDisconnectedAction,
  sessionConnectedAction,
  sessionAuthErrorAction,
  sessionExpiringAction,
  reauthAction,
  sessionForceCloseAction,
} from './actions'
import { sessionActions } from './features'
import {
  authErrorAction,
  authSuccessAction,
  authExpiringAction,
} from './actions'
import { AuthError } from '../CustomErrors'
import { PubSubChannel, SessionChannel } from './interfaces'
import { createRestartableSaga } from './utils/sagaHelpers'
// import { componentCleanupSaga } from './features/component/componentSaga'

interface StartSagaOptions {
  session: BaseSession
  sessionChannel: SessionChannel
  pubSubChannel: PubSubChannel
  userOptions: InternalUserOptions
}

export function* initSessionSaga({
  initSession,
  userOptions,
  channels,
}: {
  initSession: () => BaseSession
  userOptions: InternalUserOptions
  channels: InternalChannels
}): SagaIterator {
  const session = initSession()

  /**
   * Channel to communicate between sagas and emit events to
   * the public
   */
  const pubSubChannel = channels.pubSubChannel
  /**
   * Channel to broadcast all the events sent by the server
   */
  const swEventChannel = channels.swEventChannel
  /**
   * Channel to communicate with base session
   */
  const sessionChannel = channels.sessionChannel

  /**
   * Start all the custom workers on startup
   */
  let customTasks: Task[] = []
  if (userOptions.workers?.length) {
    try {
      const effects = userOptions.workers.map((saga) => {
        return call(createRestartableSaga(saga))
      })
      customTasks = yield all(effects)
    } catch (error) {
      getLogger().error('Error running custom workers', error)
    }
  }

  yield fork(sessionChannelWatcher, {
    session,
    sessionChannel,
    pubSubChannel,
    swEventChannel,
  })

  /**
   * Fork the watcher for the pubSubChannel
   */
  const pubSubTask: Task = yield fork(pubSubSaga, {
    pubSubChannel,
    emitter: userOptions.emitter!,
  })

  /**
   * Fork the watcher for the session status
   */
  const sessionStatusTask: Task = yield fork(sessionStatusWatcher, {
    session,
    sessionChannel,
    pubSubChannel,
    userOptions,
  })

  // const compCleanupTask = yield fork(componentCleanupSaga)

  session.connect()

  yield take(destroyAction.type)

  /**
   * We have to manually cancel the fork because it is not
   * being automatically cleaned up when the session is
   * destroyed, most likely because it's using a timer.
   */
  // compCleanupTask?.cancel()
  pubSubTask.cancel()
  sessionStatusTask.cancel()
  customTasks.forEach((task) => task.cancel())
  /**
   * Do not close pubSubChannel, swEventChannel, and sessionChannel
   * since we may need them again in case of reauth/reconnect
   * // pubSubChannel.close()
   * // swEventChannel.close()
   * // sessionChannel.close()
   */

  session.disconnect()
}

export function* reauthenticateWorker({
  session,
  token,
  pubSubChannel,
}: {
  session: BaseSession
  token: string
  pubSubChannel: PubSubChannel
}) {
  try {
    if (session.reauthenticate) {
      session.token = token
      yield call(session.reauthenticate)
      // Update the store with the new "connect result"
      yield put(sessionActions.connected(session.rpcConnectResult))
      yield put(pubSubChannel, sessionConnectedAction())
    }
  } catch (error) {
    getLogger().error('Reauthenticate Error', error)
    session.authError(error)
  }
}

export function* sessionStatusWatcher(options: StartSagaOptions): SagaIterator {
  getLogger().debug('sessionStatusWatcher [started]')

  try {
    while (true) {
      const action = yield take([
        authSuccessAction.type,
        authErrorAction.type,
        authExpiringAction.type,
        reauthAction.type,
        sessionReconnectingAction.type,
        sessionDisconnectedAction.type,
        sessionForceCloseAction.type,
      ])

      getLogger().debug('sessionStatusWatcher', action.type, action.payload)
      switch (action.type) {
        case authSuccessAction.type: {
          const { session, pubSubChannel } = options
          yield put(sessionActions.connected(session.rpcConnectResult))
          yield put(pubSubChannel, sessionConnectedAction())
          break
        }
        case authErrorAction.type: {
          yield fork(sessionAuthErrorSaga, {
            ...options,
            action,
          })
          break
        }
        case authExpiringAction.type: {
          yield put(options.pubSubChannel, sessionExpiringAction())
          break
        }
        case reauthAction.type: {
          yield fork(reauthenticateWorker, {
            session: options.session,
            token: action.payload.token,
            pubSubChannel: options.pubSubChannel,
          })
          break
        }
        case sessionReconnectingAction.type: {
          yield put(options.pubSubChannel, sessionReconnectingAction())
          break
        }
        case sessionDisconnectedAction.type: {
          yield put(options.pubSubChannel, sessionDisconnectedAction())
          yield put(destroyAction())
          break
        }
        case sessionForceCloseAction.type: {
          options.session.forceClose()
          break
        }
      }
    }
  } finally {
    if (yield cancelled()) {
      getLogger().debug('sessionStatusWatcher [cancelled]')
    }
  }
}

interface SessionAuthErrorOptions extends StartSagaOptions {
  action: any
}
export function* sessionAuthErrorSaga(
  options: SessionAuthErrorOptions
): SagaIterator {
  getLogger().debug('sessionAuthErrorSaga [started]')

  try {
    const { pubSubChannel, action } = options
    const { error: authError } = action.payload
    const error = authError
      ? new AuthError(authError.code, authError.message)
      : new Error('Unauthorized')

    yield put(pubSubChannel, sessionAuthErrorAction(error))
  } finally {
    if (yield cancelled()) {
      getLogger().debug('sessionAuthErrorSaga [cancelled]')
    }
  }
}

interface RootSagaOptions {
  initSession: () => BaseSession
}

export default (options: RootSagaOptions) => {
  return function* root({
    userOptions,
    channels,
  }: {
    userOptions: InternalUserOptions
    channels: InternalChannels
  }): SagaIterator {
    if (userOptions.logger) {
      setLogger(userOptions.logger)
    }
    if (userOptions.debug) {
      setDebugOptions(userOptions.debug)
    }

    while (true) {
      /**
       * Wait for an initAction to start
       */
      const action = yield take([initAction.type, reauthAction.type])

      /**
       * Update token only if the action contains a `token`
       * (case of reauthAction with a new token)
       */
      if (action?.payload?.token) {
        userOptions.token = action.payload.token
      }

      /**
       * Create Session and related sessionChannel to
       * send/receive websocket messages
       */
      try {
        yield call(initSessionSaga, {
          ...options,
          userOptions,
          channels,
        })
      } catch (error) {
        getLogger().error('RootSaga Error:', error)
      } finally {
        if (yield cancelled()) {
          getLogger().debug('rootSaga [cancelled]')
        }
        getLogger().debug('Reboot rootSaga')
      }
    }
  }
}
