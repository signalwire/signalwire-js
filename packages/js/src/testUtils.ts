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

export const dispatchMockedCallJoined = ({
  session,
  roomId,
  roomSessionId,
  memberId,
  memberId2 = 'member-id-random',
  callId,
  nodeId,
}: {
  session: any
  roomSessionId: string
  roomId: string
  memberId: string
  memberId2?: string
  callId: string
  nodeId: string
}) => {
  const payload = {
    jsonrpc: '2.0',
    id: 'cb78f2eb-6468-48ed-979d-a94fca47befe',
    method: 'signalwire.event',
    params: {
      event_type: 'call.joined',
      event_channel:
        'signalwire_0c1c9852-b9d4-4a18-ba3b-eeafe1ffe504_13451811-bd4c-4646-b3ce-250581a7956e_94df1ecd-d073-473d-aa4d-a286e24f679b',
      params: {
        room_session: {
          room_id: roomId,
          room_session_id: roomSessionId,
          event_channel:
            'signalwire_0c1c9852-b9d4-4a18-ba3b-eeafe1ffe504_13451811-bd4c-4646-b3ce-250581a7956e_94df1ecd-d073-473d-aa4d-a286e24f679b',
          layout_name: '1x1',
          meta: {},
          members: [
            {
              type: 'member',
              call_id: callId,
              member_id: memberId,
              node_id: nodeId,
              name: 'sip:foo@94df1ecd-d073-473d-aa4d-a286e24f679b.call.signalwire.com;context=private',
              room_id: roomId,
              room_session_id: roomSessionId,
              visible: true,
              handraised: false,
              audio_muted: false,
              video_muted: false,
              deaf: false,
              meta: {},
            },
            {
              type: 'member',
              call_id: callId,
              member_id: memberId2,
              node_id: nodeId,
              name: 'sip:foo@94df1ecd-d073-473d-aa4d-a286e24f679b.call.signalwire.com;context=private',
              room_id: roomId,
              room_session_id: roomSessionId,
              visible: true,
              handraised: false,
              audio_muted: false,
              video_muted: false,
              deaf: false,
              meta: {},
            },
          ],
          recordings: [],
          streams: [],
          playbacks: [],
        },
        room_id: roomId,
        room_session_id: roomSessionId,
        call_id: callId,
        member_id: memberId,
        node_id: nodeId,
      },
      timestamp: 1712142454.67701,
    },
  }

  // @ts-expect-error
  session.dispatch(actions.socketMessageAction(payload))
}
