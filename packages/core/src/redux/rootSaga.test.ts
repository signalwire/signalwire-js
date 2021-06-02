import { channel, eventChannel } from 'redux-saga'
import { expectSaga, testSaga } from 'redux-saga-test-plan'
import {
  socketClosedWorker,
  sessionStatusWatcher,
  startSaga,
  initSessionSaga,
} from './rootSaga'
import {
  createSessionChannel,
  sessionChannelWatcher,
} from './features/session/sessionSaga'
import { sessionActions } from './features'
import {
  sessionDisconnected,
  authSuccess,
  authError,
  socketError,
  socketClosed,
} from './actions'

describe('socketClosedWorker', () => {
  it('should try to reconnect when code >= 1006 && code <= 1014', async () => {
    const session = {
      closed: true,
      connect: jest.fn(),
    } as any
    const timeout = 3000
    const pubSubChannel = channel()
    const sessionChannel = eventChannel(() => () => {})

    return expectSaga(socketClosedWorker, {
      session,
      pubSubChannel,
      sessionChannel,
      payload: { code: 1006, reason: '' },
    })
      .put(sessionActions.statusChange('reconnecting'))
      .call(session.connect)
      .run(timeout)
  })

  it('should close the session when the code is outside the range we handle for reconnecting', async () => {
    const session = {
      closed: true,
      connect: jest.fn(),
    } as any
    const pubSubChannel = channel()
    const sessionChannel = eventChannel(() => () => {})

    return Promise.all([
      expectSaga(socketClosedWorker, {
        session,
        pubSubChannel,
        sessionChannel,
        payload: { code: 1002, reason: '' },
      })
        .put(sessionActions.statusChange('disconnected'))
        .put(pubSubChannel, sessionDisconnected())
        .run(),
      expectSaga(socketClosedWorker, {
        session,
        pubSubChannel,
        sessionChannel,
        payload: { code: 1000, reason: '' },
      })
        .put(sessionActions.statusChange('disconnected'))
        .put(pubSubChannel, sessionDisconnected())
        .run(),
      expectSaga(socketClosedWorker, {
        session,
        pubSubChannel,
        sessionChannel,
        payload: { code: 1020, reason: '' },
      })
        .put(sessionActions.statusChange('disconnected'))
        .put(pubSubChannel, sessionDisconnected())
        .run(),
    ])
  })
})

describe('sessionStatusWatcher', () => {
  const actions = [authSuccess.type, socketError.type, socketClosed.type]
  const session = {
    closed: true,
    connect: jest.fn(),
  } as any
  const pubSubChannel = channel()
  const sessionChannel = eventChannel(() => () => {})
  const userOptions = {
    token: '',
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
    saga.next(authSuccess()).fork(startSaga, options)
    saga.next().isDone()
  })

  it('should fork socketClosedWorker on socketClosed action', () => {
    const payload = { code: 1006, reason: '' }
    const saga = testSaga(sessionStatusWatcher, options)

    saga.next().take(actions)
    saga.next(socketClosed(payload)).fork(socketClosedWorker, {
      session,
      pubSubChannel,
      sessionChannel,
      payload,
    })
    saga.next().isDone()
  })
})

describe.only('initSessionSaga', () => {
  const session = {
    connect: jest.fn(),
  } as any
  const SessionConstructor = jest.fn().mockImplementation(() => {
    return session
  })
  const pubSubChannel = channel()
  const sessionChannel = eventChannel(() => () => {})
  const userOptions = {
    token: '',
  }

  beforeEach(() => {
    session.connect.mockClear()
  })

  it('should create the session, fork its watcher and fork startSaga in case of authSuccess', () => {
    const saga = testSaga(initSessionSaga, SessionConstructor, userOptions)
    saga.next(sessionChannel).call(createSessionChannel, session)
    saga.next(sessionChannel).call(channel)
    saga.next(pubSubChannel).fork(sessionChannelWatcher, {
      session,
      sessionChannel,
      pubSubChannel,
    })
    saga.next().take([authSuccess.type, authError.type])
    expect(session.connect).toHaveBeenCalledTimes(1)
    saga.next(authSuccess()).fork(startSaga, {
      session,
      pubSubChannel,
      sessionChannel,
      userOptions,
    })
    saga.next().isDone()
  })

  it('should create the session, fork its watcher and throw an error in case of authError', () => {
    const saga = testSaga(initSessionSaga, SessionConstructor, userOptions)
    saga.next(sessionChannel).call(createSessionChannel, session)
    saga.next(sessionChannel).call(channel)
    saga.next(pubSubChannel).fork(sessionChannelWatcher, {
      session,
      sessionChannel,
      pubSubChannel,
    })
    saga.next().take([authSuccess.type, authError.type])
    expect(session.connect).toHaveBeenCalledTimes(1)
    expect(() => {
      saga.next(authError({ error: { code: 123, error: 'Unauthorized' } }))
    }).toThrow('Auth Error')
    saga.next().isDone()
  })
})
