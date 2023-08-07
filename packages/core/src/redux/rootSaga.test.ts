import { expectSaga, testSaga } from 'redux-saga-test-plan'
import type { Task } from '@redux-saga/types'
import { createMockTask } from '@redux-saga/testing-utils'
import rootSaga, {
  sessionStatusWatcher,
  initSessionSaga,
  sessionAuthErrorSaga,
} from './rootSaga'
import { sessionChannelWatcher } from './features/session/sessionSaga'
import { sessionActions } from './features'
import {
  sessionDisconnectedAction,
  sessionReconnectingAction,
  sessionForceCloseAction,
  authSuccessAction,
  authErrorAction,
  authExpiringAction,
  destroyAction,
  initAction,
  reauthAction,
} from './actions'
import { AuthError } from '../CustomErrors'
import { createSwEventChannel, createSessionChannel } from '../testUtils'

describe('sessionStatusWatcher', () => {
  const actions = [
    authSuccessAction.type,
    authErrorAction.type,
    authExpiringAction.type,
    reauthAction.type,
    sessionReconnectingAction.type,
    sessionForceCloseAction.type,
  ]
  const session = {
    closed: true,
    connect: jest.fn(),
    disconnect: jest.fn(),
  } as any
  const sessionChannel = createSessionChannel()
  const mockEmitter = { emit: jest.fn() } as any
  const sessionEmitter = { emit: jest.fn() } as any
  const userOptions = { token: '', emitter: mockEmitter }
  const options = {
    session,
    sessionChannel,
    sessionEmitter,
    userOptions,
  }

  it('should fork startSaga on authSuccess action', () => {
    const saga = testSaga(sessionStatusWatcher, options)
    saga.next().take(actions)
    saga
      .next(authSuccessAction())
      .put(sessionActions.connected(session.rpcConnectResult))
      .next()

    expect(sessionEmitter.emit).toHaveBeenCalledWith('session.connected')

    // Saga waits again for actions due to the while loop
    const firstSagaTask: Task = createMockTask()
    saga.next(firstSagaTask).take(actions)
  })

  it('should fork sessionAuthErrorSaga on authError action and emit destroyAction', () => {
    let runSaga = true
    const action = authErrorAction({
      error: { code: 123, message: 'Protocol Error' },
    })
    const error = new AuthError(123, 'Protocol Error')
    return expectSaga(sessionStatusWatcher, options)
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
      .silentRun()
      .then(() => {
        expect(sessionEmitter.emit).toHaveBeenCalledWith(
          'session.auth_error',
          error
        )
      })
  })

  it('should emit session.expiring on session emitter', () => {
    const saga = testSaga(sessionStatusWatcher, options)

    saga.next().take(actions)
    saga.next(authExpiringAction())

    expect(sessionEmitter.emit).toHaveBeenCalledWith('session.expiring')

    // Saga waits again for actions due to the while loop
    saga.next()
  })

  it('should emit sessionReconnectingAction on the session emitter', () => {
    const saga = testSaga(sessionStatusWatcher, options)

    saga.next().take(actions)
    saga.next(sessionReconnectingAction())

    expect(sessionEmitter.emit).toHaveBeenCalledWith('session.reconnecting')

    // Saga waits again for actions due to the while loop
    saga.next()
  })
})

describe('initSessionSaga', () => {
  const session = {
    connect: jest.fn(),
    disconnect: jest.fn(),
  } as any
  const initSession = jest.fn().mockImplementation(() => session)
  const sessionEmitter = { emit: jest.fn() } as any
  const userOptions = {
    token: '',
    emitter: jest.fn() as any,
  }

  beforeEach(() => {
    session.connect.mockClear()
    session.disconnect.mockClear()
    sessionEmitter.emit.mockClear()
  })

  it('should create the session, the sessionChannel and fork watchers', () => {
    const swEventChannel = createSwEventChannel()
    swEventChannel.close = jest.fn()
    const sessionChannel = createSessionChannel()
    sessionChannel.close = jest.fn()

    const saga = testSaga(initSessionSaga, {
      initSession,
      userOptions,
      channels: { swEventChannel, sessionChannel },
      sessionEmitter,
    })

    saga.next(sessionChannel).fork(sessionChannelWatcher, {
      session,
      sessionChannel,
      swEventChannel,
    })

    const sessionStatusTask = createMockTask()
    sessionStatusTask.cancel = jest.fn()
    saga.next()
    saga.next(sessionStatusTask).take(destroyAction.type)
    saga.next().take(sessionDisconnectedAction.type)
    saga.next()
    expect(sessionEmitter.emit).toHaveBeenCalledWith('session.disconnected')

    saga.next().isDone()
    expect(sessionStatusTask.cancel).toHaveBeenCalledTimes(1)
    expect(swEventChannel.close).not.toHaveBeenCalled()
    expect(session.connect).toHaveBeenCalledTimes(1)
    expect(session.disconnect).toHaveBeenCalledTimes(1)
  })
})

describe('rootSaga as restartable', () => {
  const swEventChannel = createSwEventChannel()
  const sessionChannel = createSessionChannel()
  const sessionEmitter = jest.fn()

  it('wait for initAction and fork initSessionSaga', () => {
    const session = {
      connect: jest.fn(),
    } as any
    const initSession = jest.fn().mockImplementation(() => session)
    const userOptions = { token: '', emitter: jest.fn() as any }
    const channels = { swEventChannel, sessionChannel }
    const saga = testSaga(
      rootSaga({
        initSession,
        // @ts-expect-error
        sessionEmitter,
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
      sessionEmitter,
    })
    saga.next().cancelled()
    saga.next().take([initAction.type, reauthAction.type])
  })
})
