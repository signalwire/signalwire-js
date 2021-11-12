import type { Task, SagaIterator } from '@redux-saga/types'
import { channel, EventChannel } from '@redux-saga/core'
import { fork, call, take, put, delay, all } from '@redux-saga/core/effects'
import { SessionConstructor, InternalUserOptions } from '../utils/interfaces'
import { getLogger, setDebugOptions, setLogger } from '../utils'
import { BaseSession } from '../BaseSession'
import {
  executeActionWatcher,
  sessionChannelWatcher,
  createSessionChannel,
} from './features/session/sessionSaga'
import { pubSubSaga } from './features/pubSub/pubSubSaga'
import {
  flushExecuteQueueWorker,
  executeQueueWatcher,
} from './features/executeQueue/executeQueueSaga'
import {
  initAction,
  destroyAction,
  closeConnectionAction,
  sessionReconnectingAction,
  sessionDisconnectedAction,
  sessionConnectedAction,
  reauthAction,
} from './actions'
import { sessionActions } from './features'
import {
  authErrorAction,
  authSuccessAction,
  socketClosedAction,
  socketErrorAction,
} from './actions'
import { AuthError } from '../CustomErrors'
import { PubSubChannel } from './interfaces'
import { createRestartableSaga } from './utils/sagaHelpers'

interface StartSagaOptions {
  session: BaseSession
  sessionChannel: EventChannel<unknown>
  pubSubChannel: PubSubChannel
  userOptions: InternalUserOptions
}

export function* initSessionSaga(
  SessionConstructor: SessionConstructor,
  userOptions: InternalUserOptions
): SagaIterator {
  const session = new SessionConstructor(userOptions)

  const sessionChannel: EventChannel<unknown> = yield call(
    createSessionChannel,
    session
  )

  /**
   * Create a channel to communicate between sagas
   * and emit events to the public
   */
  const pubSubChannel: PubSubChannel = yield call(channel)

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
  })

  /**
   * Fork the watcher for the session status
   */
  yield fork(sessionStatusWatcher, {
    session,
    sessionChannel,
    pubSubChannel,
    userOptions,
  })

  session.connect()

  yield take(destroyAction.type)
  pubSubChannel.close()
  sessionChannel.close()
  customTasks.forEach((task) => task.cancel())
}

export function* socketClosedWorker({
  session,
  sessionChannel,
  pubSubChannel,
}: {
  session: BaseSession
  sessionChannel: EventChannel<unknown>
  pubSubChannel: PubSubChannel
}) {
  if (session.status === 'reconnecting') {
    yield put(pubSubChannel, sessionReconnectingAction())
    yield delay(Math.random() * 2000)
    yield call(session.connect)
  } else {
    sessionChannel.close()
    yield put(pubSubChannel, sessionDisconnectedAction())
  }
}

export function* reauthenticateWorker({
  session,
  token,
}: {
  session: BaseSession
  token: string
}) {
  try {
    if (session.reauthenticate) {
      session.token = token
      yield call(session.reauthenticate)
    }
  } catch (error) {
    getLogger().error('Reauthenticate Error', error)
  }
}

export function* sessionStatusWatcher(options: StartSagaOptions): SagaIterator {
  while (true) {
    const action = yield take([
      authSuccessAction.type,
      authErrorAction.type,
      socketErrorAction.type,
      socketClosedAction.type,
      reauthAction.type,
    ])

    switch (action.type) {
      case authSuccessAction.type:
        yield fork(startSaga, options)
        break
      case authErrorAction.type: {
        const { error: authError } = action.payload
        const error = authError
          ? new AuthError(authError.code, authError.error)
          : new Error('Unauthorized')
        throw error
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
        })
        break
      }
    }
  }
}

export function* startSaga(options: StartSagaOptions): SagaIterator {
  const { session, pubSubChannel, userOptions } = options

  const pubSubTask: Task = yield fork(pubSubSaga, {
    pubSubChannel,
    emitter: userOptions.emitter!,
  })
  /**
   * Fork the watcher for all the execute requests
   */
  const executeActionTask: Task = yield fork(executeActionWatcher, session)

  yield put(sessionActions.connected(session.rpcConnectResult))
  yield put(pubSubChannel, sessionConnectedAction())

  /**
   * Will take care of executing any pending JSONRPC we have in
   * the queue
   */
  const flushExecuteQueueTask: Task = yield fork(flushExecuteQueueWorker)

  /**
   * When `closeConnectionAction` is dispatched we'll teardown all the
   * tasks created by this saga since `startSaga` is meant to be
   * re-executed every time the user reconnects.
   */
  yield take(closeConnectionAction.type)

  pubSubTask.cancel()
  executeActionTask.cancel()
  flushExecuteQueueTask.cancel()
}

interface RootSagaOptions {
  SessionConstructor: SessionConstructor
}

export default (options: RootSagaOptions) => {
  return function* root(userOptions: InternalUserOptions): SagaIterator {
    if (userOptions.logger) {
      setLogger(userOptions.logger)
    }
    if (userOptions.debug) {
      setDebugOptions(userOptions.debug)
    }

    yield fork(executeQueueWatcher)

    /**
     * Wait for an initAction to start
     */
    yield take(initAction.type)

    /**
     * Create Session and related sessionChannel to
     * send/receive websocket messages
     */
    try {
      yield call(initSessionSaga, options.SessionConstructor, userOptions)
    } catch (error) {
      return
    }
  }
}
