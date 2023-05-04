import { expectSaga } from 'redux-saga-test-plan'
import * as matchers from 'redux-saga-test-plan/matchers'
import { throwError } from 'redux-saga-test-plan/providers'
import rootSaga, {
  sessionStatusWatcher,
  initSessionSaga,
  sessionAuthErrorSaga,
} from './rootSaga'
import { sessionChannelWatcher } from './features/session/sessionSaga'
import { pubSubSaga } from './features/pubSub/pubSubSaga'
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
  sessionAuthorizedAction,
} from './actions'
import { AuthError } from '../CustomErrors'
import {
  createPubSubChannel,
  createSwEventChannel,
  createSessionChannel,
  createRootChannel,
} from '../testUtils'

describe('sessionStatusWatcher', () => {
  const session = {
    closed: true,
    connect: jest.fn(),
    disconnect: jest.fn(),
    forceClose: jest.fn(),
  } as any
  const rootChannel = createRootChannel()
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
    rootChannel,
    pubSubChannel,
    sessionChannel,
    userOptions,
  }

  it('should fork startSaga on authSuccess action', () => {
    let runSaga = true
    const action = authSuccessAction()
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
      .put(sessionAuthorizedAction(session.rpcConnectResult))
      .put(pubSubChannel, sessionConnectedAction())
      .silentRun()
  })

  it('should fork sessionAuthErrorSaga on authError action and put destroyAction', () => {
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
      .put(pubSubChannel, sessionAuthErrorAction(error))
      .silentRun()
  })

  it('should put sessionExpiringAction on authExpiringAction', () => {
    let runSaga = true
    const action = authExpiringAction()
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
      .put(pubSubChannel, sessionExpiringAction())
      .silentRun()
  })

  it('should put sessionReconnectingAction on the pubSubChannel', () => {
    let runSaga = true
    const action = sessionReconnectingAction()

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
      .put(pubSubChannel, sessionReconnectingAction())
      .silentRun()
  })

  it('should invoke session.forceClose() on sessionForceCloseAction', async () => {
    let runSaga = true
    const action = sessionForceCloseAction()

    await expectSaga(sessionStatusWatcher, options)
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
      .silentRun()

    expect(session.forceClose).toHaveBeenCalledTimes(1)
  })
})

describe('initSessionSaga', () => {
  const session = {
    connect: jest.fn(),
    disconnect: jest.fn(),
  } as any
  const initSession = jest.fn().mockImplementation(() => session)
  const pubSubChannel = createPubSubChannel()
  const mockEmitter = {
    emit: jest.fn(),
  } as any
  const userOptions = {
    token: '',
    emitter: mockEmitter,
    pubSubChannel,
  }

  beforeEach(() => {
    session.connect.mockClear()
  })

  it('should create the session, the sessionChannel and fork watchers', async () => {
    const rootChannel = createRootChannel()
    rootChannel.close = jest.fn()
    const pubSubChannel = createPubSubChannel()
    pubSubChannel.close = jest.fn()
    const swEventChannel = createSwEventChannel()
    swEventChannel.close = jest.fn()
    const sessionChannel = createSessionChannel()
    sessionChannel.close = jest.fn()
    const takes: string[] = []

    await expectSaga(initSessionSaga, {
      initSession,
      userOptions,
      channels: {
        rootChannel,
        pubSubChannel,
        swEventChannel,
        sessionChannel,
      },
    })
      .provide([
        {
          take(_opts, next) {
            if (typeof _opts.pattern === 'string') {
              if (_opts.pattern === destroyAction.type) {
                takes.push(_opts.pattern)
                return destroyAction()
              }
              if (_opts.pattern === sessionDisconnectedAction.type) {
                takes.push(_opts.pattern)
                return sessionDisconnectedAction()
              }
            }
            return next()
          },
        },
      ])
      .fork(sessionChannelWatcher, {
        session,
        rootChannel,
        sessionChannel,
        pubSubChannel,
        swEventChannel,
      })
      .fork(pubSubSaga, {
        pubSubChannel,
        emitter: userOptions.emitter,
      })
      .fork(sessionStatusWatcher, {
        session,
        rootChannel,
        sessionChannel,
        pubSubChannel,
        userOptions,
      })
      .silentRun()

    expect(rootChannel.close).not.toHaveBeenCalled()
    expect(pubSubChannel.close).not.toHaveBeenCalled()
    expect(swEventChannel.close).not.toHaveBeenCalled()
    expect(session.connect).toHaveBeenCalledTimes(1)
    expect(session.disconnect).toHaveBeenCalledTimes(1)

    expect(takes).toStrictEqual([
      destroyAction.type,
      sessionDisconnectedAction.type,
    ])
  })
})

describe('rootSaga as restartable', () => {
  const rootChannel = createRootChannel()
  const pubSubChannel = createPubSubChannel()
  const swEventChannel = createSwEventChannel()
  const sessionChannel = createSessionChannel()
  const channels = {
    rootChannel,
    pubSubChannel,
    swEventChannel,
    sessionChannel,
  }
  const actions = [initAction, reauthAction]
  actions.forEach((action) => {
    it(`wait for ${action.type} and fork initSessionSaga - in case of error it reboots`, async () => {
      const session = {
        connect: jest.fn(),
      } as any
      const initSession = jest.fn().mockImplementation(() => session)
      const userOptions = { token: '', emitter: jest.fn() as any }
      let runSaga = true

      await expectSaga(
        rootSaga({
          initSession,
        }),
        {
          userOptions,
          channels,
        }
      )
        .provide([
          [matchers.call.fn(initSessionSaga), throwError(new Error('Random'))],
          {
            take(_opts, next) {
              if (runSaga) {
                runSaga = false
                return action({ token: 'a' })
              }
              return next()
            },
          },
        ])
        .call(initSessionSaga, {
          initSession,
          userOptions,
          channels,
        })
        .silentRun()
        .then((result) => {
          const { allEffects } = result
          // 2 take since rootSaga restarted
          expect(allEffects.filter((t) => t.type === 'TAKE').length).toBe(2)
        })
    })
  })
})
