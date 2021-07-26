import { Task, SagaIterator, Channel } from '@redux-saga/types'
import { channel, EventChannel } from 'redux-saga'
import { fork, call, take, put, delay } from 'redux-saga/effects'
import { UserOptions, SessionConstructor } from '../utils/interfaces'
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
} from './actions'
import { sessionActions } from './features'
import { BaseSession } from '..'
import {
  authErrorAction,
  authSuccessAction,
  socketClosedAction,
  socketErrorAction,
} from './actions'
import { AuthError } from '../CustomErrors'

type StartSagaOptions = {
  session: BaseSession
  sessionChannel: EventChannel<unknown>
  pubSubChannel: Channel<unknown>
  userOptions: UserOptions
}

export function* initSessionSaga(
  SessionConstructor: SessionConstructor,
  userOptions: UserOptions
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
  const pubSubChannel: Channel<unknown> = yield call(channel)

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
}

export function* socketClosedWorker({
  session,
  sessionChannel,
  pubSubChannel,
}: {
  session: BaseSession
  sessionChannel: EventChannel<unknown>
  pubSubChannel: Channel<unknown>
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

export function* sessionStatusWatcher(options: StartSagaOptions): SagaIterator {
  while (true) {
    const action = yield take([
      authSuccessAction.type,
      authErrorAction.type,
      socketErrorAction.type,
      socketClosedAction.type,
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
    }
  }
}

export function* startSaga(options: StartSagaOptions): SagaIterator {
  const { session, pubSubChannel, userOptions } = options

  const pubSubTask: Task = yield fork(pubSubSaga, {
    pubSubChannel,
    emitter: userOptions.emitter,
  })
  /**
   * Fork the watcher for all the blade.execute requests
   */
  const executeActionTask: Task = yield fork(executeActionWatcher, session)

  yield put(sessionActions.connected(session.connectResult))
  yield put(pubSubChannel, sessionConnectedAction())

  /**
   * Will take care of executing any pending blade.execute we have in
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
  return function* root(userOptions: UserOptions): SagaIterator {
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
