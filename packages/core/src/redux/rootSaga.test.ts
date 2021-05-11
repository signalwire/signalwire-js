import { channel, eventChannel } from 'redux-saga'
import { expectSaga } from 'redux-saga-test-plan'
import { makeSocketClosedWorker } from './rootSaga'
import { sessionActions } from './features'

describe('makeSocketClosedWorker', () => {
  it.only('should try to reconnect when code === 1006', async () => {
    const connect = jest.fn()
    const session = {
      closed: true,
      connect: connect,
    } as any

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
      .run()
  })
})
