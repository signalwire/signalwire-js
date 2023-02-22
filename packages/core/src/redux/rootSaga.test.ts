import { expectSaga, testSaga } from 'redux-saga-test-plan'
import type { Task } from '@redux-saga/types'
import { createMockTask } from '@redux-saga/testing-utils'
import rootSaga, {
  sessionStatusWatcher,
  initSessionSaga,
  sessionAuthErrorSaga,
} from './rootSaga'
import {
  executeActionWatcher,
  sessionChannelWatcher,
} from './features/session/sessionSaga'
import { pubSubSaga } from './features/pubSub/pubSubSaga'
import { sessionActions } from './features'
import {
  sessionConnectedAction,
  sessionDisconnectedAction,
  sessionReconnectingAction,
  sessionAuthErrorAction,
  sessionExpiringAction,
  sessionForceCloseAction,
  authSuccessAction,
  authErrorAction,
  authExpiringAction,
  destroyAction,
  initAction,
  reauthAction,
} from './actions'
import { AuthError } from '../CustomErrors'
import {
  createPubSubChannel,
  createSwEventChannel,
  createSessionChannel,
} from '../testUtils'

describe('sessionStatusWatcher', () => {
  const actions = [
    authSuccessAction.type,
    authErrorAction.type,
    authExpiringAction.type,
    reauthAction.type,
    sessionReconnectingAction.type,
    sessionDisconnectedAction.type,
    sessionForceCloseAction.type,
  ]
  const session = {
    closed: true,
    connect: jest.fn(),
    disconnect: jest.fn(),
  } as any
  const pubSubChannel = createPubSubChannel()
  const sessionChannel = createSessionChannel()
  const mockEmitter = {
    emit: jest.fn(),
  } as any
  const userOptions = {
    token: '',
    emitter: mockEmitter,
  }
  const options = {
    session,
    pubSubChannel,
    sessionChannel,
    userOptions,
  }

  it('should fork startSaga on authSuccess action', () => {
    const saga = testSaga(sessionStatusWatcher, options)
    saga.next().take(actions)
    saga
      .next(authSuccessAction())
      .put(sessionActions.connected(session.rpcConnectResult))
    saga.next().put(pubSubChannel, sessionConnectedAction())

    // Saga waits again for actions due to the while loop
    const firstSagaTask: Task = createMockTask()
    saga.next(firstSagaTask).take(actions)
  })

  it('should fork sessionAuthErrorSaga on authError action and put destroyAction', () => {
    let runSaga = true
    const action = authErrorAction({
      error: { code: 123, message: 'Protocol Error' },
    })
    const error = new AuthError(123, 'Protocol Error')
    return (
      expectSaga(sessionStatusWatcher, options)
        .provide([
          {
            take(_opts, next) {
              if (runSaga) {
                runSaga = false
                return action
              }
              return next()
            },
          },
        ])
        .fork(sessionAuthErrorSaga, { ...options, action })
        .put(pubSubChannel, sessionAuthErrorAction(error))
        // .put(destroyAction())
        .silentRun()
    )
  })

  it('should put sessionExpiringAction on authExpiringAction', () => {
    const saga = testSaga(sessionStatusWatcher, options)

    saga.next().take(actions)
    saga
      .next(authExpiringAction())
      .put(options.pubSubChannel, sessionExpiringAction())
    // Saga waits again for actions due to the while loop
    saga.next().take(actions)
  })

  it('should put sessionReconnectingAction on the pubSubChannel', () => {
    const saga = testSaga(sessionStatusWatcher, options)

    saga.next().take(actions)
    saga
      .next(sessionReconnectingAction())
      .put(options.pubSubChannel, sessionReconnectingAction())
    // Saga waits again for actions due to the while loop
    saga.next().take(actions)
  })

  it('should put sessionDisconnectedAction on the pubSubChannel and put destroyAction', () => {
    const saga = testSaga(sessionStatusWatcher, options)

    saga.next().take(actions)
    saga
      .next(sessionDisconnectedAction())
      .put(options.pubSubChannel, sessionDisconnectedAction())
    saga.next().put(destroyAction())
    // Saga waits again for actions due to the while loop
    saga.next().take(actions)
  })
})

describe('initSessionSaga', () => {
  const session = {
    connect: jest.fn(),
    disconnect: jest.fn(),
  } as any
  const initSession = jest.fn().mockImplementation(() => session)
  const pubSubChannel = createPubSubChannel()
  const userOptions = {
    token: '',
    emitter: jest.fn() as any,
    pubSubChannel,
  }

  beforeEach(() => {
    session.connect.mockClear()
  })

  it('should create the session, the sessionChannel and fork watchers', () => {
    const pubSubChannel = createPubSubChannel()
    pubSubChannel.close = jest.fn()
    const swEventChannel = createSwEventChannel()
    swEventChannel.close = jest.fn()
    const sessionChannel = createSessionChannel()
    sessionChannel.close = jest.fn()
    const saga = testSaga(initSessionSaga, {
      initSession,
      userOptions,
      channels: { pubSubChannel, swEventChannel, sessionChannel },
    })
    saga.next(sessionChannel).fork(sessionChannelWatcher, {
      session,
      sessionChannel,
      pubSubChannel,
      swEventChannel,
    })
    saga.next().fork(pubSubSaga, {
      pubSubChannel,
      emitter: userOptions.emitter,
    })
    const pubSubTask = createMockTask()
    pubSubTask.cancel = jest.fn()
    saga.next(pubSubTask).fork(sessionStatusWatcher, {
      session,
      sessionChannel,
      pubSubChannel,
      userOptions,
    })
    const sessionStatusTask = createMockTask()
    sessionStatusTask.cancel = jest.fn()
    saga.next(sessionStatusTask).fork(executeActionWatcher, session)

    const executeActionTask = createMockTask()
    executeActionTask.cancel = jest.fn()
    saga.next(executeActionTask).take(destroyAction.type)
    saga.next().isDone()
    expect(pubSubTask.cancel).toHaveBeenCalledTimes(1)
    expect(sessionStatusTask.cancel).toHaveBeenCalledTimes(1)
    expect(pubSubChannel.close).not.toHaveBeenCalled()
    expect(swEventChannel.close).not.toHaveBeenCalled()
    expect(session.connect).toHaveBeenCalledTimes(1)
    expect(session.disconnect).toHaveBeenCalledTimes(1)
  })
})

describe('rootSaga as restartable', () => {
  const pubSubChannel = createPubSubChannel()
  const swEventChannel = createSwEventChannel()
  const sessionChannel = createSessionChannel()
  it('wait for initAction and fork initSessionSaga', () => {
    const session = {
      connect: jest.fn(),
    } as any
    const initSession = jest.fn().mockImplementation(() => session)
    const userOptions = { token: '', emitter: jest.fn() as any }
    const channels = { pubSubChannel, swEventChannel, sessionChannel }
    const saga = testSaga(
      rootSaga({
        initSession,
      }),
      {
        userOptions,
        channels,
      }
    )

    saga.next().take([initAction.type, reauthAction.type])
    saga.next().call(initSessionSaga, {
      initSession,
      userOptions,
      channels,
    })
    saga.next().cancelled()
    saga.next().take([initAction.type, reauthAction.type])
  })
})
