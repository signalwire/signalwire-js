import { Task, SagaIterator, Channel } from '@redux-saga/types'
import { channel, EventChannel } from 'redux-saga'
import { fork, call, take, put, delay } from 'redux-saga/effects'
import { SocketCloseParams } from './interfaces'
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

  console.log('>>> initSessionSaga connect <<<')
  session.connect()

  const action = yield take([authSuccess.type, authError.type])

  if (action.type === authError.type) {
    throw new Error('Auth Error')
  } else {
    yield fork(startSaga, {
      session,
      sessionChannel,
      pubSubChannel,
      userOptions,
    })
  }
}

export function* socketClosedWorker({
  session,
  sessionChannel,
  pubSubChannel,
  payload: { code },
}: {
  session: BaseSession
  sessionChannel: EventChannel<unknown>
  pubSubChannel: Channel<unknown>
  payload: SocketCloseParams
}) {
  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
   */
  // TODO: restore to original its value 1006
  if (code >= 1000 && code <= 1014) {
    yield put(sessionActions.statusChange('reconnecting'))
    yield put(pubSubChannel, sessionReconnecting())
    yield delay(Math.random() * 2000)
    console.log('>>> socketClosedWorker reconnecting? <<<')
    yield call(session.connect)
  } else {
    sessionChannel.close()
    yield put(sessionActions.statusChange('disconnected'))
    yield put(pubSubChannel, sessionDisconnected())
  }
}

export function* sessionStatusWatcher(options: StartSagaOptions): SagaIterator {
  while (true) {
    const { session, sessionChannel, pubSubChannel } = options
    const action = yield take([
      // authSuccess.type,
      socketError.type,
      socketClosed.type,
    ])

    console.log('>>> sessionStatusWatcher <<<', action.type)

    switch (action.type) {
      // TODO: see how to handle this case without relying on `startSaga`
      // case authSuccess.type:
      //   yield fork(startSaga, options)
      //   break
      case socketError.type:
        // TODO: define if we want to emit external events here.
        // yield put(pubSubChannel, {
        //   type: 'socket.error',
        //   payload: {},
        // })
        break
      case socketClosed.type:
        console.log('----> [sessionStatusWatcher] -> socketClosed type handler')

        yield fork(socketClosedWorker, {
          session,
          sessionChannel,
          pubSubChannel,
          payload: action.payload,
        })
    }
  }
}

export function* startSaga(options: StartSagaOptions): SagaIterator {
  const { session, sessionChannel, pubSubChannel, userOptions } = options
  yield put(sessionActions.connected(session.bladeConnectResult))
  yield put(pubSubChannel, sessionConnected())

  console.log('----------> Start SAGA ------------------>')

  const pubSubTask: Task = yield fork(pubSubSaga, {
    pubSubChannel,
    emitter: userOptions.emitter,
  })

  /**
   * Fork the watcher for all the blade.execute requests
   */
  const executeActionTask: Task = yield fork(executeActionWatcher, session)

  /**
   * Fork the watcher for the session status
   */
  const sessionStatusTask: Task = yield fork(sessionStatusWatcher, options)

  /**
   * Wait for a destroyAction to teardown all the things
   */
  yield take(destroyAction.type)

  pubSubTask.cancel()
  sessionStatusTask.cancel()
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
