import { Saga, Task, SagaIterator, Channel } from '@redux-saga/types'
import { channel, EventChannel } from 'redux-saga'
import { all, spawn, fork, call, take, put } from 'redux-saga/effects'
import { GetDefaultSagas } from './interfaces'
import { UserOptions, SessionConstructor } from '../utils/interfaces'
import {
  executeActionWatcher,
  sessionChannelWatcher,
  createSessionChannel,
} from './features/session/sessionSaga'
import { pubSubSaga } from './features/pubSub/pubSubSaga'
import { logger } from '../utils'
import { initAction, destroyAction } from './actions'
import { sessionActions } from './features'
import { Session } from '..'

// prettier-ignore
const ROOT_SAGAS: Saga[] = []

const getDefaultSagas = () => {
  return ROOT_SAGAS
}

const initSession = (
  SessionConstructor: SessionConstructor,
  userOptions: UserOptions
) => {
  logger.debug('Init Session', userOptions)
  return new Promise((resolve, reject) => {
    const session = new SessionConstructor({
      ...userOptions,
      onReady: async () => {
        resolve(session)
        userOptions?.onReady?.()
      },
      onAuthError: async (error) => {
        reject(error)
        userOptions?.onAuthError?.(error)
      },
    })

    session.connect()
  })
}

interface RootSagaOptions {
  SessionConstructor: SessionConstructor
  sagas?: (fn: GetDefaultSagas) => Saga[]
}

export default (options: RootSagaOptions) => {
  const sagas = options.sagas
    ? options.sagas(getDefaultSagas)
    : getDefaultSagas()

  return function* root(userOptions: UserOptions): SagaIterator {
    /**
     * Wait for an initAction to start
     */
    yield take(initAction.type)

    /**
     * Create Session and related sessionChannel to
     * send/receive websocket messages
     */
    let session: Session
    try {
      session = yield call(initSession, options.SessionConstructor, userOptions)
    } catch (error) {
      yield put(sessionActions.authError({ authError: error }))
      return
    }

    const sessionChannel: EventChannel<unknown> = yield call(
      createSessionChannel,
      session
    )
    yield put(sessionActions.connected(session.bladeConnectResult))

    /**
     * Create a channel to communicate between sagas
     * and emit events to the public
     */
    const pubSubChannel: Channel<unknown> = yield call(channel)

    const pubSubTask: Task = yield fork(pubSubSaga, {
      pubSubChannel,
      emitter: userOptions.emitter,
    })

    /**
     * Fork different sagas that require session
     * - executeActionWatcher
     * - sessionChannelWatcher
     */
    const sessionTaskList: Task[] = yield all([
      fork(executeActionWatcher, session),
      fork(sessionChannelWatcher, {
        session,
        sessionChannel,
        pubSubChannel,
      }),
    ])

    yield all(
      sagas.map((saga) =>
        spawn(function* () {
          while (true) {
            try {
              yield call(saga)
              break
            } catch (error) {
              console.warn('RootSaga catch:', error)
            }
          }
        })
      )
    )

    /**
     * Wait for a destroyAction to teardown all the things
     */
    yield take(destroyAction.type)

    pubSubTask.cancel()
    sessionTaskList.forEach((task) => task.cancel())
    pubSubChannel.close()
    sessionChannel.close()
  }
}
