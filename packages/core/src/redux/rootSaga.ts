import { Saga, Task, SagaIterator, Channel } from '@redux-saga/types'
import { channel, EventChannel } from 'redux-saga'
import { fork, call, take, put } from 'redux-saga/effects'
import { GetDefaultSagas } from './interfaces'
import { UserOptions, SessionConstructor } from '../utils/interfaces'
import {
  executeActionWatcher,
  sessionChannelWatcher,
  createSessionChannel,
} from './features/session/sessionSaga'
import { pubSubSaga } from './features/pubSub/pubSubSaga'
import { initAction, destroyAction } from './actions'
import { sessionActions } from './features'
import { Session } from '..'
import { authError, authSuccess, socketClosed, socketError } from './actions'
import { delay } from '@redux-saga/core/effects'

// prettier-ignore
// const ROOT_SAGAS: Saga[] = []

// const getDefaultSagas = () => {
//   return ROOT_SAGAS
// }

function* initSessionSaga(
  SessionConstructor: SessionConstructor,
  userOptions: UserOptions
): SagaIterator {
  const session = new SessionConstructor(userOptions)

  // @ts-ignore
  window.__session = session

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

export const makeSocketClosedWorker = ({
  session,
  sessionChannel,
  pubSubChannel,
}: {
  session: Session
  sessionChannel: EventChannel<unknown>
  pubSubChannel: Channel<unknown>
}) =>
  function* ({ code }: { code: number; reason: string }) {
    /**
     * @see https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
     */
    if (code >= 1006 && code <= 1014) {
      yield put(sessionActions.socketStatusChange('reconnecting'))
      yield delay(Math.random() * 2000)
      yield call(session.connect)
    } else {
      sessionChannel.close()
      yield put(sessionActions.socketStatusChange('closed'))
      yield put(pubSubChannel, {
        type: 'socket.closed',
        payload: {},
      })
    }
  }

function* watchSessionStatus({
  session,
  sessionChannel,
  pubSubChannel,
  userOptions,
}: {
  session: Session
  sessionChannel: EventChannel<unknown>
  pubSubChannel: Channel<unknown>
  userOptions: UserOptions
}): SagaIterator {
  const action = yield take([
    authSuccess.type,
    socketError.type,
    socketClosed.type,
  ])

  switch (action.type) {
    case authSuccess.type:
      yield fork(startSaga, {
        session,
        sessionChannel,
        pubSubChannel,
        userOptions,
      })
      break
    case socketError.type:
      yield put(pubSubChannel, {
        type: 'socket.error',
        payload: {},
      })
      break
    case socketClosed.type:
      return makeSocketClosedWorker({
        session,
        sessionChannel,
        pubSubChannel,
      })(action.payload)
  }
}

function* startSaga(options: {
  session: Session
  sessionChannel: EventChannel<unknown>
  pubSubChannel: Channel<unknown>
  userOptions: UserOptions
}): SagaIterator {
  const { session, sessionChannel, pubSubChannel, userOptions } = options
  yield put(sessionActions.connected(session.bladeConnectResult))

  const pubSubTask: Task = yield fork(pubSubSaga, {
    pubSubChannel,
    emitter: userOptions.emitter,
  })

  /**
   * Fork different sagas that require session
   * - executeActionWatcher
   */
  const executeActionTask: Task = yield fork(executeActionWatcher, session)

  /**
   * Fork the reconnect watcher
   */
  const reconnectTask: Task = yield fork(watchSessionStatus, options)

  /**
   * Wait for a destroyAction to teardown all the things
   */
  yield take(destroyAction.type)

  pubSubTask.cancel()
  reconnectTask.cancel()
  executeActionTask.cancel()
  // sessionTaskList.forEach((task) => task.cancel())
  pubSubChannel.close()
  sessionChannel.close()
}

interface RootSagaOptions {
  SessionConstructor: SessionConstructor
  sagas?: (fn: GetDefaultSagas) => Saga[]
}

export default (options: RootSagaOptions) => {
  // const sagas = options.sagas
  //   ? options.sagas(getDefaultSagas)
  //   : getDefaultSagas()

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
