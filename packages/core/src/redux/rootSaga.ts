import type { Task, SagaIterator } from '@redux-saga/types'
import { EventChannel } from '@redux-saga/core'
import {
  fork,
  call,
  take,
  put,
  delay,
  all,
  cancelled,
} from '@redux-saga/core/effects'
import {
  SessionConstructor,
  InternalUserOptions,
  InternalChannels,
} from '../utils/interfaces'
import { getLogger, setDebugOptions, setLogger } from '../utils'
import { BaseSession } from '../BaseSession'
import {
  executeActionWatcher,
  sessionChannelWatcher,
  createSessionChannel,
} from './features/session/sessionSaga'
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
} from './actions'
import { sessionActions } from './features'
import {
  authErrorAction,
  authSuccessAction,
  authExpiringAction,
  socketClosedAction,
  socketErrorAction,
} from './actions'
import { AuthError } from '../CustomErrors'
import { PubSubChannel } from './interfaces'
import { createRestartableSaga } from './utils/sagaHelpers'
// import { componentCleanupSaga } from './features/component/componentSaga'

interface StartSagaOptions {
  session: BaseSession
  sessionChannel: EventChannel<unknown>
  pubSubChannel: PubSubChannel
  userOptions: InternalUserOptions
}

export function* initSessionSaga({
  SessionConstructor,
  userOptions,
  channels,
}: {
  SessionConstructor: SessionConstructor
  userOptions: InternalUserOptions
  channels: InternalChannels
}): SagaIterator {
  const session = new SessionConstructor(userOptions)

  const sessionChannel: EventChannel<unknown> = yield call(
    createSessionChannel,
    session
  )

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

  /**
   * Fork the watcher for all the execute requests
   */
  const executeActionTask: Task = yield fork(executeActionWatcher, session)

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
  executeActionTask.cancel()
  sessionChannel.close()
  customTasks.forEach((task) => task.cancel())
  /**
   * Do not close pubSubChannel and swEventChannel
   * since we may need them again in case of reauth/reconnect
   * // pubSubChannel.close()
   * // swEventChannel.close()
   */
}

export function* socketClosedWorker({
  session,
  pubSubChannel,
}: {
  session: BaseSession
  sessionChannel: EventChannel<unknown>
  pubSubChannel: PubSubChannel
}) {
  getLogger().debug('socketClosedWorker', session.status)
  if (session.status === 'reconnecting') {
    yield put(pubSubChannel, sessionReconnectingAction())
    yield delay(Math.random() * 2000)
    yield call(session.connect)
  } else if (session.status === 'disconnected') {
    yield put(pubSubChannel, sessionDisconnectedAction())
    yield put(destroyAction())
    /**
     * Don't invoke the sessionChannel.close() in here because
     * we still need to dispatch/emit actions from Session to our Sagas
     * // sessionChannel.close()
     */
  } else {
    getLogger().warn('Unhandled Session Status', session.status)

    if ('development' === process.env.NODE_ENV) {
      throw new Error(`Unhandled Session Status: '${session.status}'`)
    }
  }
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
    yield put(authErrorAction({ error }))
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
        socketErrorAction.type,
        socketClosedAction.type,
        reauthAction.type,
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
        case socketErrorAction.type:
          // TODO: define if we want to emit external events here.
          // yield put(pubSubChannel, {
          //   type: 'socket.error',
          //   payload: {},
          // })
          break
        case socketClosedAction.type:
          yield fork(socketClosedWorker, options)
          break
        case reauthAction.type: {
          yield fork(reauthenticateWorker, {
            session: options.session,
            token: action.payload.token,
            pubSubChannel: options.pubSubChannel,
          })
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
    const { pubSubChannel, session, action } = options
    const { error: authError } = action.payload
    const error = authError
      ? new AuthError(authError.code, authError.message)
      : new Error('Unauthorized')

    yield put(pubSubChannel, sessionAuthErrorAction(error))

    /**
     * Force-close the sessionChannel to disconnect the Session
     */
    yield call([session, session.disconnect])
  } finally {
    if (yield cancelled()) {
      getLogger().debug('sessionAuthErrorSaga [cancelled]')
    }
  }
}

interface RootSagaOptions {
  SessionConstructor: SessionConstructor
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
