import { configureStore, EventEmitter, actions } from '@signalwire/core'
import { JWTSession } from './JWTSession'

const PROJECT_ID = '8f0a119a-cda7-4497-a47d-c81493b824d4'
const TOKEN = '<VRT>'

/**
 * Helper method to configure a Store w/o Saga middleware.
 * Useful to test slices and reducers logic.
 *
 * @returns Redux Store
 */
export const configureJestStore = () => {
  return configureStore({
    userOptions: {
      project: PROJECT_ID,
      token: TOKEN,
      devTools: false,
      emitter: new EventEmitter(),
    },
    SessionConstructor: JWTSession,
    runSagaMiddleware: false,
  })
}

/**
 * Helper method to configure a Store with a rootSaga
 * and a mocked Session object.
 * This allow to write integration tests.
 *
 * @returns { store, session, emitter, destroy }
 */
export const configureFullStack = () => {
  const session = {
    dispatch: console.log,
    connect: jest.fn(),
    disconnect: jest.fn(),
    execute: jest.fn(),
  }
  const emitter = new EventEmitter()
  const store = configureStore({
    userOptions: {
      project: PROJECT_ID,
      token: TOKEN,
      devTools: false,
      emitter,
    },
    SessionConstructor: jest.fn().mockImplementation(() => {
      return session
    }),
  })

  session.dispatch = (payload) => {
    store.channels.sessionChannel.put(payload)
  }

  store.dispatch(actions.initAction())
  store.dispatch(actions.authSuccessAction())

  return {
    store,
    session,
    emitter,
    destroy: () => store.dispatch(actions.destroyAction()),
  }
}

export const dispatchMockedRoomSubscribed = ({
  session,
  roomId,
  roomSessionId,
  memberId,
  callId,
}: {
  session: any
  roomSessionId: string
  roomId: string
  memberId: string
  callId: string
}) => {
  const payload: any = {
    jsonrpc: '2.0',
    id: 'd8a9fb9a-ad28-4a0a-8caa-5e06ec22f856',
    method: 'signalwire.event',
    params: {
      event_type: 'video.room.subscribed',
      event_channel: 'EC_4d2c491d-bf96-4802-9008-c360a51155a2',
      params: {
        call_id: callId,
        member_id: memberId,
        room_session: {
          room_id: roomId,
          id: roomSessionId,
        },
      },
    },
  }

  session.dispatch(actions.socketMessageAction(payload))
}
