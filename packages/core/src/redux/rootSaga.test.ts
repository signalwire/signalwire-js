import { expectSaga, testSaga } from 'redux-saga-test-plan'
import type { Task } from '@redux-saga/types'
import { createMockTask } from '@redux-saga/testing-utils'
import rootSaga, {
  sessionStatusWatcher,
  sessionSaga,
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

  it('should update the store and emit event on authSuccessAction', () => {
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

  it('should fork sessionAuthErrorSaga on authError action and emit event', () => {
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

  it('should emit session.expiring on authExpiringAction', () => {
    const saga = testSaga(sessionStatusWatcher, options)

    saga.next().take(actions)
    saga.next(authExpiringAction())

    expect(sessionEmitter.emit).toHaveBeenCalledWith('session.expiring')

    // Saga waits again for actions due to the while loop
    saga.next()
  })

  it('should emit session.reconnecting on sessionReconnectingAction', () => {
    const saga = testSaga(sessionStatusWatcher, options)

    saga.next().take(actions)
    saga.next(sessionReconnectingAction())

    expect(sessionEmitter.emit).toHaveBeenCalledWith('session.reconnecting')

    // Saga waits again for actions due to the while loop
    saga.next()
  })
})

describe('sessionSaga', () => {
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

  it('should create the session, fork/cancel session watchers, and close channels', () => {
    const swEventChannel = createSwEventChannel()
    swEventChannel.close = jest.fn()
    const sessionChannel = createSessionChannel()
    sessionChannel.close = jest.fn()

    const sessionChannelTask = createMockTask()
    sessionChannelTask.cancel = jest.fn()
    const sessionStatusTask = createMockTask()
    sessionStatusTask.cancel = jest.fn()

    const saga = testSaga(sessionSaga, {
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
    saga.next(sessionChannelTask).fork(sessionStatusWatcher, {
      session,
      sessionEmitter,
      sessionChannel,
      userOptions,
    })

    saga.next(sessionStatusTask).take(destroyAction.type)
    expect(session.connect).toHaveBeenCalledTimes(1)
    expect(session.disconnect).toHaveBeenCalledTimes(0)

    saga.next().take(sessionDisconnectedAction.type)
    expect(session.connect).toHaveBeenCalledTimes(1)
    expect(session.disconnect).toHaveBeenCalledTimes(1)

    saga.next()
    expect(sessionEmitter.emit).toHaveBeenCalledWith('session.disconnected')

    saga.next().isDone()
    expect(sessionStatusTask.cancel).toHaveBeenCalledTimes(1)
    expect(sessionChannelTask.cancel).toHaveBeenCalledTimes(1)
    expect(swEventChannel.close).toHaveBeenCalled()
    expect(sessionChannel.close).toHaveBeenCalled()
  })
})

describe('rootSaga', () => {
  const swEventChannel = createSwEventChannel()
  const sessionChannel = createSessionChannel()
  const sessionEmitter = { emit: jest.fn() } as any

  it('should wait for initAction and fork sessionSaga', () => {
    const session = {
      connect: jest.fn(),
    } as any
    const initSession = jest.fn().mockImplementation(() => session)
    const userOptions = { token: '', emitter: jest.fn() as any }
    const channels = { swEventChannel, sessionChannel }
    const saga = testSaga(
      rootSaga({
        initSession,
        sessionEmitter,
      }),
      {
        userOptions,
        channels,
      }
    )

    saga.next().take(initAction.type)
    saga.next().call(sessionSaga, {
      initSession,
      userOptions,
      channels,
      sessionEmitter,
    })
    saga.next().cancelled()
  })

  it('should reboot the saga after sessionSaga fails and react to initAction', () => {
    const session = {
      connect: jest.fn(),
    } as any
    const initSession = jest.fn().mockImplementation(() => session)

    const userOptions = {
      token: '',
      emitter: jest.fn() as any,
      logger: {
        fatal: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        trace: jest.fn(),
      },
    }
    const channels = { swEventChannel, sessionChannel }

    const saga = testSaga(rootSaga({ initSession, sessionEmitter }), {
      userOptions,
      channels,
    })

    const error = new Error('sessionSaga failed')

    saga.next().take(initAction.type) // Wait for initAction
    saga.next({ type: initAction.type }).call(sessionSaga, {
      initSession,
      sessionEmitter,
      userOptions,
      channels,
    }) // Simulate call to sessionSaga
    saga.throw(error) // Simulate sessionSaga throwing an error
    saga.next() // Handle error and restart
    expect(userOptions.logger.debug).toHaveBeenCalledWith('Reboot rootSaga') // Verify reboot logging
    saga.next({ type: initAction.type }).call(sessionSaga, {
      initSession,
      sessionEmitter,
      userOptions,
      channels,
    }) // Simulate the next initAction and restart sessionSaga
  })
})
