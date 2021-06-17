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
  initAction,
  destroyAction,
  sessionReconnecting,
  sessionDisconnected,
  sessionConnected,
} from './actions'
import { sessionActions } from './features'
import { BaseSession } from '..'
import { authError, authSuccess, socketClosed, socketError } from './actions'
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
    yield put(pubSubChannel, sessionReconnecting())
    yield delay(Math.random() * 2000)
    console.log('>>> socketClosedWorker reconnecting? <<<')
    yield call(session.connect)
  } else {
    sessionChannel.close()
    yield put(pubSubChannel, sessionDisconnected())
  }
}

export function* sessionStatusWatcher(options: StartSagaOptions): SagaIterator {
  while (true) {
    const action = yield take([
      authSuccess.type,
      authError.type,
      socketError.type,
      socketClosed.type,
    ])

    switch (action.type) {
      case authSuccess.type:
        yield fork(startSaga, options)
        break
      case authError.type: {
        const { error: authError } = action.payload
        const error = authError
          ? new AuthError(authError.code, authError.error)
          : new Error('Unauthorized')
        throw error
      }
      case socketError.type:
        // TODO: define if we want to emit external events here.
        // yield put(pubSubChannel, {
        //   type: 'socket.error',
        //   payload: {},
        // })
        break
      case socketClosed.type:
        yield fork(socketClosedWorker, options)
    }
  }
}

export function* startSaga(options: StartSagaOptions): SagaIterator {
  const { session, sessionChannel, pubSubChannel, userOptions } = options
  yield put(sessionActions.connected(session.bladeConnectResult))
  yield put(pubSubChannel, sessionConnected())

  const pubSubTask: Task = yield fork(pubSubSaga, {
    pubSubChannel,
    emitter: userOptions.emitter,
  })

  /**
   * Fork the watcher for all the blade.execute requests
   */
  const executeActionTask: Task = yield fork(executeActionWatcher, session)

  /**
   * Wait for a destroyAction to teardown all the things
   */
  yield take(destroyAction.type)

  pubSubTask.cancel()
  executeActionTask.cancel()
  pubSubChannel.close()
  sessionChannel.close()
}

interface RootSagaOptions {
  SessionConstructor: SessionConstructor
}

export default (options: RootSagaOptions) => {
  return function* root(userOptions: UserOptions): SagaIterator {
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
