import { channel, eventChannel } from '@redux-saga/core'
import { expectSaga, testSaga } from 'redux-saga-test-plan'
import rootSaga, {
  socketClosedWorker,
  sessionStatusWatcher,
  startSaga,
  initSessionSaga,
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
  authSuccessAction,
  authErrorAction,
  socketErrorAction,
  socketClosedAction,
  destroyAction,
  initAction,
  closeConnectionAction,
  reauthAction,
} from './actions'
import { AuthError } from '../CustomErrors'
import { createPubSubChannel } from '../testUtils'

describe('socketClosedWorker', () => {
  it('should try to reconnect when session status is reconnecting', async () => {
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

  it('should close the session when session status is not reconnecting', async () => {
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
    socketErrorAction.type,
    socketClosedAction.type,
    reauthAction.type,
  ]
  const session = {
    closed: true,
    connect: jest.fn(),
  } as any
  const pubSubChannel = createPubSubChannel()
  const sessionChannel = eventChannel(() => () => {})
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

  it('should fork startSaga on authSuccess action', () => {
    const saga = testSaga(sessionStatusWatcher, options)
    saga.next().take(actions)
    saga.next(authSuccessAction()).fork(startSaga, options)
    // Saga waits again for actions due to the while loop
    saga.next().take(actions)
  })

  it('should throw Auth Error on authError action', () => {
    const saga = testSaga(sessionStatusWatcher, options)
    saga.next().take(actions)
    try {
      saga.next(
        authErrorAction({ error: { code: 123, error: 'Protocol Error' } })
      )
    } catch (error) {
      expect(error).toBeInstanceOf(AuthError)
      expect(error.message).toEqual('Protocol Error')
    }
    // Saga terminated due to the error
    saga.next().isDone()
  })

  it('should fork socketClosedWorker on socketClosed action', () => {
    const saga = testSaga(sessionStatusWatcher, options)

    saga.next().take(actions)
    saga.next(socketClosedAction()).fork(socketClosedWorker, options)
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
  const userOptions = {
    token: '',
    emitter: jest.fn() as any,
  }

  beforeEach(() => {
    session.connect.mockClear()
  })

  it('should create the session, the sessionChannel and fork watchers', () => {
    const pubSubChannel = createPubSubChannel()
    pubSubChannel.close = jest.fn()
    const sessionChannel = eventChannel(() => () => {})
    sessionChannel.close = jest.fn()
    const saga = testSaga(initSessionSaga, SessionConstructor, userOptions)
    saga.next(sessionChannel).call(createSessionChannel, session)
    saga.next(sessionChannel).call(channel)
    saga.next(pubSubChannel).fork(sessionChannelWatcher, {
      session,
      sessionChannel,
      pubSubChannel,
    })
    saga.next().fork(sessionStatusWatcher, {
      session,
      sessionChannel,
      pubSubChannel,
      userOptions,
    })
    saga.next().take(destroyAction.type)
    saga.next().isDone()
    expect(pubSubChannel.close).toHaveBeenCalledTimes(1)
    expect(sessionChannel.close).toHaveBeenCalledTimes(1)
    saga.next().isDone()
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
    const pubSubTask = { cancel: jest.fn() }
    const executeActionTask = { cancel: jest.fn() }
    const executeQueueCallTask = { cancel: jest.fn() }

    const saga = testSaga(startSaga, options)
    saga.next().fork(pubSubSaga, {
      pubSubChannel,
      emitter: userOptions.emitter,
    })
    saga.next(pubSubTask).fork(executeActionWatcher, session)

    saga
      .next(executeActionTask)
      .put(sessionActions.connected(session.rpcConnectResult))
    saga.next().put(pubSubChannel, sessionConnectedAction())

    saga.next().fork(flushExecuteQueueWorker)

    saga.next(executeQueueCallTask).take(closeConnectionAction.type)
    saga.next().isDone()

    expect(pubSubTask.cancel).toHaveBeenCalledTimes(1)
    expect(executeActionTask.cancel).toHaveBeenCalledTimes(1)
    expect(executeQueueCallTask.cancel).toHaveBeenCalledTimes(1)
  })
})

describe('rootSaga', () => {
  it('wait for initAction and fork initSessionSaga', () => {
    const session = {
      connect: jest.fn(),
    } as any
    const SessionConstructor = jest.fn().mockImplementation(() => {
      return session
    })
    const userOptions = { token: '', emitter: jest.fn() as any }
    const saga = testSaga(
      rootSaga({
        SessionConstructor,
      }),
      userOptions
    )

    saga.next().fork(executeQueueWatcher)
    saga.next().take(initAction.type)
    saga.next().call(initSessionSaga, SessionConstructor, userOptions)
    saga.next().isDone()
  })
})
