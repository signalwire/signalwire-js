import { channel, eventChannel } from 'redux-saga'
import { expectSaga } from 'redux-saga-test-plan'
import { sessionChannelWatcher, createSessionChannel } from './sessionSaga'
import { socketMessage } from '../../actions'
import { componentActions } from '../'

describe('sessionChannelWatcher', () => {
  describe('conferenceWorker', () => {
    it('should handle room.subscribed dispatching componentActions.upsert and the room.joined', async () => {
      const jsonrpc = JSON.parse(
        '{"jsonrpc":"2.0","id":"ddcd9807-0339-4a39-92b1-ab7967b84782","method":"blade.broadcast","params":{"broadcaster_nodeid":"2286cac8-1346-474f-9913-7ca9c3df9fc8@west-us","protocol":"signalwire_0d8d431757079b56923f7a2acc25ef69e3f698dd36689ca472cf6bc0fd900426_830b7622-b03b-4a11-9109-19bf2c9e27cf_78429ef1-283b-4fa9-8ebc-16b59f95bb1f","channel":"notifications","event":"conference","params":{"params":{"room":{"room_session_id":"6fbe4472-e6dd-431f-887f-33171cd83ccb","name":"roomName","members":[{"visible":false,"room_session_id":"6fbe4472-e6dd-431f-887f-33171cd83ccb","id":"0e5f67e0-8dbf-48dd-b920-804b97fccee6","audio_muted":false,"name":"Edo","location":{"y":0,"x":0,"layer_index":0,"height":360,"z_index":0,"width":640},"video_muted":false,"room_id":"790d6c79-f0d1-421e-b5f2-f09bd05941ce","type":"member"}],"locked":false,"layouts":[{"id":"group:grid"}],"room_id":"790d6c79-f0d1-421e-b5f2-f09bd05941ce","current_layout":{"id":"1x1","layers":[{"y":0,"x":0,"layer_index":0,"height":720,"z_index":0,"width":1280}],"name":"Full Screen"}},"call_id":"0e5f67e0-8dbf-48dd-b920-804b97fccee6","member_id":"0e5f67e0-8dbf-48dd-b920-804b97fccee6"},"timestamp":"1620991212.326279","event_type":"room.subscribed","event_channel":"room.adaacbef-3d34-4a5f-a123-d3d166515ba0"}},"hops":[]}'
      )
      let runSaga = true
      const session = {
        relayProtocol: jsonrpc.params.protocol,
      } as any
      const pubSubChannel = channel()
      const sessionChannel = eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []

      return expectSaga(sessionChannelWatcher, {
        session,
        pubSubChannel,
        sessionChannel,
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === sessionChannel) {
                runSaga = false
                return socketMessage(jsonrpc)
              } else if (runSaga === false) {
                sessionChannel.close()
                pubSubChannel.close()
              }
              return next()
            },
            put(action, next) {
              dispatchedActions.push(action)
              return next()
            },
          },
        ])
        .put(
          componentActions.upsert({
            id: '0e5f67e0-8dbf-48dd-b920-804b97fccee6',
            roomId: '790d6c79-f0d1-421e-b5f2-f09bd05941ce',
            roomSessionId: '6fbe4472-e6dd-431f-887f-33171cd83ccb',
            memberId: '0e5f67e0-8dbf-48dd-b920-804b97fccee6',
          })
        )
        .put(pubSubChannel, {
          type: 'room.joined',
          payload: jsonrpc.params.params.params,
        })
        .put(pubSubChannel, {
          type: 'room.subscribed',
          payload: jsonrpc.params.params.params,
        })
        .run()
        .finally(() => {
          expect(dispatchedActions).toHaveLength(3)
        })
    })

    it('should handle member.updated dispatching the sub-events for what is changed for the user', async () => {
      const jsonrpc = JSON.parse(
        '{"jsonrpc":"2.0","id":"02f22650-8601-4e7d-bd1d-d084e69f22b0","method":"blade.broadcast","params":{"broadcaster_nodeid":"2286cac8-1346-474f-9913-7ca9c3df9fc8@west-us","protocol":"signalwire_0d8d431757079b56923f7a2acc25ef69e3f698dd36689ca472cf6bc0fd900426_2e393a80-fafe-4d73-9553-85bbf16b3a89_78429ef1-283b-4fa9-8ebc-16b59f95bb1f","channel":"notifications","event":"conference","params":{"params":{"member":{"updated":["video_muted","visible"],"room_session_id":"4bb14f10-1ed6-44a5-a286-4da86f34738d","id":"ab42641c-e784-42f1-9815-d264105bc24f","visible":true,"room_id":"790d6c79-f0d1-421e-b5f2-f09bd05941ce","video_muted":false}},"timestamp":"1620984182.577089","event_type":"member.updated","event_channel":"room.e1c5fc18-f96d-4696-bf9b-bcb2eab57906"}},"hops":[]}'
      )
      let runSaga = true
      const session = {
        relayProtocol: jsonrpc.params.protocol,
      } as any
      const pubSubChannel = channel()
      const sessionChannel = eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []
      const payload = JSON.parse(
        '{"member":{"updated":["video_muted","visible"],"room_session_id":"4bb14f10-1ed6-44a5-a286-4da86f34738d","id":"ab42641c-e784-42f1-9815-d264105bc24f","visible":true,"room_id":"790d6c79-f0d1-421e-b5f2-f09bd05941ce","video_muted":false}}'
      )

      return expectSaga(sessionChannelWatcher, {
        session,
        pubSubChannel,
        sessionChannel,
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === sessionChannel) {
                runSaga = false
                return socketMessage(jsonrpc)
              } else if (runSaga === false) {
                sessionChannel.close()
                pubSubChannel.close()
              }
              return next()
            },
            put(action, next) {
              dispatchedActions.push(action)
              return next()
            },
          },
        ])
        .put(pubSubChannel, {
          type: 'member.updated.visible',
          payload,
        })
        .put(pubSubChannel, {
          type: 'member.updated.video_muted',
          payload,
        })
        .put(pubSubChannel, {
          type: 'member.updated',
          payload,
        })
        .run()
        .finally(() => {
          expect(dispatchedActions).toHaveLength(3)
        })
    })
  })
})

describe('createSessionChannel', () => {
  it('should override session.dispatch to pass actions and invoke session.disconnect on close', () => {
    const session = {
      disconnect: jest.fn(),
    } as any

    const sessionChannel = createSessionChannel(session)

    expect(session.dispatch).toBeDefined()
    sessionChannel.take((param) => {
      expect(param).toStrictEqual('Triggered!')
    })
    session.dispatch('Triggered!')

    sessionChannel.close()
    expect(session.disconnect).toHaveBeenCalledTimes(1)
  })
})
