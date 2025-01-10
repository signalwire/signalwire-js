import type { Task, SagaIterator } from '@redux-saga/types'
import { fork, call, take, put, all, cancelled } from '@redux-saga/core/effects'
import {
  InternalUserOptions,
  InternalChannels,
  ClientEvents,
} from '../utils/interfaces'
import { getLogger, setDebugOptions, setLogger } from '../utils'
import { BaseSession } from '../BaseSession'
import { sessionChannelWatcher } from './features/session/sessionSaga'
import {
  initAction,
  destroyAction,
  sessionReconnectingAction,
  sessionDisconnectedAction,
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
import { SessionChannel } from './interfaces'
import { createRestartableSaga } from './utils/sagaHelpers'
import { EventEmitter } from '../utils/EventEmitter'

interface StartSagaOptions {
  session: BaseSession
  sessionEmitter: EventEmitter<ClientEvents>
  sessionChannel: SessionChannel
  userOptions: InternalUserOptions
}

export function* sessionSaga({
  initSession,
  sessionEmitter,
  userOptions,
  channels,
}: {
  initSession: () => BaseSession
  sessionEmitter: EventEmitter<ClientEvents>
  userOptions: InternalUserOptions
  channels: InternalChannels
}): SagaIterator {
  getLogger().debug('sessionSaga [started]')

  const session = initSession()
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

  const sessionChannelTask: Task = yield fork(sessionChannelWatcher, {
    session,
    sessionChannel,
    swEventChannel,
  })

  /**
   * Fork the watcher for the session status
   */
  const sessionStatusTask: Task = yield fork(sessionStatusWatcher, {
    session,
    sessionEmitter,
    sessionChannel,
    userOptions,
  })

  session.connect()

  yield take(destroyAction.type)

  session.disconnect()

  yield take(sessionDisconnectedAction.type)
  sessionEmitter.emit('session.disconnected')

  /**
   * Session disconnected: Cancel the session watchers.
   */
  sessionStatusTask.cancel()
  sessionChannelTask.cancel()
  customTasks.forEach((task) => task.cancel())

  /**
   * Session disconnected: Close channels.
   */
  swEventChannel.close()
  sessionChannel.close()

  getLogger().debug('sessionSaga [ended]')
}

export function* reauthenticateWorker({
  session,
  token,
  sessionEmitter,
}: {
  session: BaseSession
  token: string
  sessionEmitter: EventEmitter<ClientEvents>
}) {
  try {
    if (session.reauthenticate) {
      session.token = token
      yield call(session.reauthenticate)
      // Update the store with the new "connect result"
      yield put(sessionActions.connected(session.rpcConnectResult))
      sessionEmitter.emit('session.connected')
    }
  } catch (error) {
    getLogger().error('Reauthenticate Error', error)
    session.authError(error)
  }
}

export function* sessionStatusWatcher(options: StartSagaOptions): SagaIterator {
  getLogger().debug('sessionStatusWatcher [started]')
  const { session, sessionEmitter } = options

  try {
    while (true) {
      const action = yield take([
        authSuccessAction.type,
        authErrorAction.type,
        authExpiringAction.type,
        reauthAction.type,
        sessionReconnectingAction.type,
        sessionForceCloseAction.type,
      ])

      getLogger().debug('sessionStatusWatcher', action.type, action.payload)
      switch (action.type) {
        case authSuccessAction.type: {
          yield put(sessionActions.connected(session.rpcConnectResult))
          sessionEmitter.emit('session.connected')
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
          sessionEmitter.emit('session.expiring')
          break
        }
        case reauthAction.type: {
          yield fork(reauthenticateWorker, {
            session: session,
            token: action.payload.token,
            sessionEmitter,
          })
          break
        }
        case sessionReconnectingAction.type: {
          sessionEmitter.emit('session.reconnecting')
          break
        }
        case sessionForceCloseAction.type: {
          session.forceClose()
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
    const { action, sessionEmitter } = options
    const { error: authError } = action.payload
    const error = authError
      ? new AuthError(authError.code, authError.message)
      : new Error('Unauthorized')

    sessionEmitter.emit('session.auth_error', error)
  } finally {
    if (yield cancelled()) {
      getLogger().debug('sessionAuthErrorSaga [cancelled]')
    }
  }
}

interface RootSagaOptions {
  initSession: () => BaseSession
  sessionEmitter: EventEmitter<ClientEvents>
}

export default (options: RootSagaOptions) => {
  return function* root({
    userOptions,
    channels,
  }: {
    userOptions: InternalUserOptions
    channels: InternalChannels
  }): SagaIterator {
    getLogger().debug('rootSaga [started]')

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
      yield take(initAction.type)

      /**
       * Create Session and related sessionChannel to
       * send/receive websocket messages
       */
      try {
        yield call(sessionSaga, {
          ...options,
          userOptions,
          channels,
        })

        /**
         * Stop the Root Saga when the session is disconnected
         */
        break
      } catch (error) {
        getLogger().error('RootSaga Error:', error)
      } finally {
        if (yield cancelled()) {
          getLogger().debug('rootSaga [cancelled]')
        }
        getLogger().debug('Reboot rootSaga')
      }
    }
    getLogger().debug('rootSaga [finished]')
  }
}
