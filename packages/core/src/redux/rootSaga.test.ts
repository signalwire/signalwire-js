import { eventChannel } from '@redux-saga/core'
import { expectSaga, testSaga } from 'redux-saga-test-plan'
import type { Task } from '@redux-saga/types'
import { createMockTask } from '@redux-saga/testing-utils'
import rootSaga, {
  socketClosedWorker,
  sessionStatusWatcher,
  startSaga,
  initSessionSaga,
  sessionAuthErrorSaga,
} from './rootSaga'
import {
  createSessionChannel,
  sessionChannelWatcher,
  executeActionWatcher,
} from './features/session/sessionSaga'
import {
  executeQueueWatcher,
  flushExecuteQueueWorker,
} from './features/executeQueue/executeQueueSaga'
import { pubSubSaga } from './features/pubSub/pubSubSaga'
import { sessionActions } from './features'
import {
  sessionConnectedAction,
  sessionDisconnectedAction,
  sessionExpiringAction,
  authSuccessAction,
  authErrorAction,
  authExpiringAction,
  socketErrorAction,
  socketClosedAction,
  destroyAction,
  initAction,
  closeConnectionAction,
  reauthAction,
} from './actions'
import { AuthError } from '../CustomErrors'
import { createPubSubChannel, createSwEventChannel } from '../testUtils'
// import { componentCleanupSaga } from './features/component/componentSaga'
import { sessionAuthErrorAction } from '.'

describe('socketClosedWorker', () => {
  it('should try to reconnect when session status is reconnecting', () => {
    const session = {
      closed: true,
      status: 'reconnecting',
      connect: jest.fn(),
    } as any
    const timeout = 3000
    const pubSubChannel = createPubSubChannel()
    const sessionChannel = eventChannel(() => () => {})

    return expectSaga(socketClosedWorker, {
      session,
      pubSubChannel,
      sessionChannel,
    })
      .call(session.connect)
      .run(timeout)
  })

  it('should close the session when session status is not reconnecting', () => {
    const session = {
      closed: true,
      status: 'disconnected',
      connect: jest.fn(),
    } as any
    const pubSubChannel = createPubSubChannel()
    const sessionChannel = eventChannel(() => () => {})

    return expectSaga(socketClosedWorker, {
      session,
      pubSubChannel,
      sessionChannel,
    })
      .put(pubSubChannel, sessionDisconnectedAction())
      .run()
  })
})

describe('sessionStatusWatcher', () => {
  const actions = [
    authSuccessAction.type,
    authErrorAction.type,
    authExpiringAction.type,
    socketErrorAction.type,
    socketClosedAction.type,
    reauthAction.type,
  ]
  const session = {
    closed: true,
    connect: jest.fn(),
    disconnect: jest.fn(),
  } as any
  const pubSubChannel = createPubSubChannel()
  const sessionChannel = eventChannel(() => () => {})
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
    saga.next(authSuccessAction()).fork(startSaga, options)
    // Saga waits again for actions due to the while loop
    const firstSagaTask: Task = createMockTask()
    saga.next(firstSagaTask).take(actions)
    // Should cancel the previous startSaga task
    saga.next(authSuccessAction()).cancel(firstSagaTask)
    saga.next().fork(startSaga, options)
    const secondSagaTask: Task = createMockTask()
    // Saga waits again for actions due to the while loop
    saga.next(secondSagaTask).take(actions)
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

  it('should fork socketClosedWorker on socketClosed action', () => {
    const saga = testSaga(sessionStatusWatcher, options)

    saga.next().take(actions)
    saga.next(socketClosedAction()).fork(socketClosedWorker, options)
    // Saga waits again for actions due to the while loop
    saga.next().take(actions)
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
})

describe('initSessionSaga', () => {
  const session = {
    connect: jest.fn(),
  } as any
  const SessionConstructor = jest.fn().mockImplementation(() => {
    return session
  })
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
    const sessionChannel = eventChannel(() => () => {})
    sessionChannel.close = jest.fn()
    const saga = testSaga(initSessionSaga, {
      SessionConstructor,
      userOptions,
      channels: { pubSubChannel, swEventChannel },
    })
    saga.next(sessionChannel).call(createSessionChannel, session)
    saga.next(sessionChannel).fork(sessionChannelWatcher, {
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
    // saga.next().fork(componentCleanupSaga)
    saga.next(sessionStatusTask).take(destroyAction.type)
    saga.next().isDone()
    expect(pubSubTask.cancel).toHaveBeenCalledTimes(1)
    expect(sessionStatusTask.cancel).toHaveBeenCalledTimes(1)
    expect(pubSubChannel.close).not.toHaveBeenCalled()
    expect(swEventChannel.close).not.toHaveBeenCalled()
    expect(sessionChannel.close).toHaveBeenCalledTimes(1)
    expect(session.connect).toHaveBeenCalledTimes(1)
  })
})

describe('startSaga', () => {
  const session = {
    rpcConnectResult: { key: 'value' },
    connect: jest.fn(),
  } as any
  const pubSubChannel = createPubSubChannel()
  pubSubChannel.close = jest.fn()
  const sessionChannel = eventChannel(() => () => {})
  sessionChannel.close = jest.fn()
  const userOptions = {
    token: '',
    emitter: jest.fn() as any,
  }
  const options = {
    session,
    pubSubChannel,
    sessionChannel,
    userOptions,
  }

  it('should put actions and fork watchers', () => {
    const executeActionTask = { cancel: jest.fn() }
    const executeQueueCallTask = { cancel: jest.fn() }

    const saga = testSaga(startSaga, options)
    saga.next().fork(executeActionWatcher, session)

    saga
      .next(executeActionTask)
      .put(sessionActions.connected(session.rpcConnectResult))
    saga.next().put(pubSubChannel, sessionConnectedAction())

    saga.next().fork(flushExecuteQueueWorker)

    saga.next(executeQueueCallTask).take(closeConnectionAction.type)
    saga.next().cancelled()
    saga.next().isDone()

    expect(executeActionTask.cancel).toHaveBeenCalledTimes(1)
    expect(executeQueueCallTask.cancel).toHaveBeenCalledTimes(1)
  })
})

describe('rootSaga as restartable', () => {
  const pubSubChannel = createPubSubChannel()
  const swEventChannel = createSwEventChannel()
  it('wait for initAction and fork initSessionSaga', () => {
    const session = {
      connect: jest.fn(),
    } as any
    const SessionConstructor = jest.fn().mockImplementation(() => {
      return session
    })
    const userOptions = { token: '', emitter: jest.fn() as any }
    const channels = { pubSubChannel, swEventChannel }
    const saga = testSaga(
      rootSaga({
        SessionConstructor,
      }),
      {
        userOptions,
        channels,
      }
    )

    saga.next().fork(executeQueueWatcher)
    saga.next().take([initAction.type, reauthAction.type])
    saga.next().call(initSessionSaga, {
      SessionConstructor,
      userOptions,
      channels,
    })
    saga.next().cancelled()
    saga.next().take([initAction.type, reauthAction.type])
  })
})
