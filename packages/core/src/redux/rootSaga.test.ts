import { channel, eventChannel } from 'redux-saga'
import { expectSaga } from 'redux-saga-test-plan'
import { makeSocketClosedWorker } from './rootSaga'
import { sessionActions } from './features'

describe('makeSocketClosedWorker', () => {
  it('should try to reconnect when code >= 1006 && code <= 1014', async () => {
    const session = {
      closed: true,
      connect: jest.fn(),
    } as any
    const timeout = 3000
    const pubSubChannel = channel()
    const sessionChannel = eventChannel(() => () => {})

    const handler = makeSocketClosedWorker({
      session,
      pubSubChannel,
      sessionChannel,
    })

    return expectSaga(handler, { code: 1006, reason: '' })
      .put(sessionActions.socketStatusChange('reconnecting'))
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

    const handler = makeSocketClosedWorker({
      session,
      pubSubChannel,
      sessionChannel,
    })

    return Promise.all([
      expectSaga(handler, { code: 1002, reason: '' })
        .put(sessionActions.socketStatusChange('closed'))
        .put(pubSubChannel, {
          type: 'socket.closed',
          payload: {},
        })
        .run(),
      expectSaga(handler, { code: 1000, reason: '' })
        .put(sessionActions.socketStatusChange('closed'))
        .put(pubSubChannel, {
          type: 'socket.closed',
          payload: {},
        })
        .run(),
      expectSaga(handler, { code: 1020, reason: '' })
        .put(sessionActions.socketStatusChange('closed'))
        .put(pubSubChannel, {
          type: 'socket.closed',
          payload: {},
        })
        .run(),
    ])
  })
})
