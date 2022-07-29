import { eventChannel } from '@redux-saga/core'
import { expectSaga } from 'redux-saga-test-plan'
import { socketMessageAction } from '../../actions'
import { componentActions } from '../'
import { sessionChannelWatcher, createSessionChannel } from './sessionSaga'
import { createPubSubChannel, createSwEventChannel } from '../../../testUtils'

jest.mock('uuid', () => {
  return {
    v4: jest.fn(() => 'mocked-uuid'),
  }
})

describe('sessionChannelWatcher', () => {
  describe('videoAPIWorker', () => {
    it('should handle video.room.subscribed dispatching componentActions.upsert and the room.joined', async () => {
      const jsonrpc = JSON.parse(
        '{"jsonrpc":"2.0","id":"828e8cf4-3be5-44d1-97eb-e701f470cepe","method":"signalwire.event","params":{"params":{"member_id":"e196da29-0080-4347-8811-b60bd35e4xxx","room":{"recording":false,"room_session_id":"9067212d-22d3-4ed9-90bb-9055367213pep","name":"realtimeRoom","hide_video_muted":false,"members":[{"visible":false,"room_session_id":"9067212d-22d3-4ed9-90bb-9055367213pep","input_volume":0,"id":"e196da29-0080-4347-8811-b60bd35e4xxx","input_sensitivity":44,"audio_muted":false,"output_volume":0,"name":"francisco","deaf":false,"video_muted":false,"room_id":"90e1349e-1c72-44f8-908c-a96dac60b47xx","type":"member"}],"room_id":"90e1349e-1c72-44f8-908c-a96dac60b47xx","event_channel":"room.4e143e89-f5d5-4476-8dd8-c52f6b4cef11x"},"call_id":"e196da29-0080-4347-8811-b60bd35e4xxx","room_session":{"recording":false,"name":"realtimeRoom","hide_video_muted":false,"id":"9067212d-22d3-4ed9-90bb-9055367213pep","members":[{"visible":false,"room_session_id":"9067212d-22d3-4ed9-90bb-9055367213pep","input_volume":0,"id":"e196da29-0080-4347-8811-b60bd35e4xxx","input_sensitivity":44,"audio_muted":false,"output_volume":0,"name":"francisco","deaf":false,"video_muted":false,"room_id":"90e1349e-1c72-44f8-908c-a96dac60b47xx","type":"member"}],"room_id":"90e1349e-1c72-44f8-908c-a96dac60b47xx","event_channel":"room.4e143e89-f5d5-4476-8dd8-c52f6b4cef11x"}},"timestamp":1632471983.7166,"event_type":"video.room.subscribed","event_channel":"room.4e143e89-f5d5-4476-8dd8-c52f6b4cef11x"}}'
      )
      let runSaga = true
      const session = {
        relayProtocol: jsonrpc.params.protocol,
      } as any
      const pubSubChannel = createPubSubChannel()
      const swEventChannel = createSwEventChannel()
      const sessionChannel = eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []

      return expectSaga(sessionChannelWatcher, {
        session,
        pubSubChannel,
        swEventChannel,
        sessionChannel,
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === sessionChannel) {
                runSaga = false
                return socketMessageAction(jsonrpc)
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
            id: 'e196da29-0080-4347-8811-b60bd35e4xxx',
            roomId: '90e1349e-1c72-44f8-908c-a96dac60b47xx',
            roomSessionId: '9067212d-22d3-4ed9-90bb-9055367213pep',
            memberId: 'e196da29-0080-4347-8811-b60bd35e4xxx',
            previewUrl: undefined,
          })
        )
        .put(pubSubChannel, {
          type: 'video.room.joined',
          payload: jsonrpc.params.params,
        })
        .put(pubSubChannel, {
          type: 'video.room.subscribed',
          payload: jsonrpc.params.params,
        })
        .run()
        .finally(() => {
          expect(dispatchedActions).toHaveLength(4)
        })
    })

    it('should handle video.member.talking and emit member.talking.start when talking: true', () => {
      const jsonrpc = JSON.parse(
        '{"jsonrpc":"2.0","id":"9050e4f8-b08e-4e39-9796-bfb6e83c2a2d","method":"signalwire.event","params":{"params":{"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","member":{"id":"a3693340-6f42-4cab-b18e-8e2a22695698","room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","talking":true}},"timestamp":1627374612.9585,"event_type":"video.member.talking","event_channel":"room.0a324e3c-5e2f-443a-a333-10bf005f249e"}}'
      )
      let runSaga = true
      const session = {
        relayProtocol: jsonrpc.params.protocol,
      } as any
      const pubSubChannel = createPubSubChannel()
      const swEventChannel = createSwEventChannel()
      const sessionChannel = eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []
      const payload = JSON.parse(
        '{"member":{"id":"a3693340-6f42-4cab-b18e-8e2a22695698","talking":true,"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426"},"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426"}'
      )

      return expectSaga(sessionChannelWatcher, {
        session,
        pubSubChannel,
        swEventChannel,
        sessionChannel,
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === sessionChannel) {
                runSaga = false
                return socketMessageAction(jsonrpc)
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
          type: 'video.member.talking.started',
          payload,
        })
        .put(pubSubChannel, {
          type: 'video.member.talking.start',
          payload,
        })
        .put(pubSubChannel, {
          type: 'video.member.talking',
          payload,
        })
        .run()
        .finally(() => {
          expect(dispatchedActions).toHaveLength(4)
        })
    })

    it('should emit member.talking.stop on member.talking with talking: false', () => {
      const jsonrpc = JSON.parse(
        '{"jsonrpc":"2.0","id":"9050e4f8-b08e-4e39-9796-bfb6e83c2a2d","method":"signalwire.event","params":{"params":{"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","member":{"id":"a3693340-6f42-4cab-b18e-8e2a22695698","room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","talking":false}},"timestamp":1627374612.9585,"event_type":"video.member.talking","event_channel":"room.0a324e3c-5e2f-443a-a333-10bf005f249e"}}'
      )
      let runSaga = true
      const session = {
        relayProtocol: jsonrpc.params.protocol,
      } as any
      const pubSubChannel = createPubSubChannel()
      const swEventChannel = createSwEventChannel()
      const sessionChannel = eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []
      const payload = JSON.parse(
        '{"member":{"id":"a3693340-6f42-4cab-b18e-8e2a22695698","talking":false,"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426"},"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426"}'
      )

      return expectSaga(sessionChannelWatcher, {
        session,
        pubSubChannel,
        swEventChannel,
        sessionChannel,
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === sessionChannel) {
                runSaga = false
                return socketMessageAction(jsonrpc)
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
          type: 'video.member.talking.ended',
          payload,
        })
        .put(pubSubChannel, {
          type: 'video.member.talking.stop',
          payload,
        })
        .put(pubSubChannel, {
          type: 'video.member.talking',
          payload,
        })
        .run()
        .finally(() => {
          expect(dispatchedActions).toHaveLength(4)
        })
    })

    it('should emit event_type and nested params on the pubSubChannel', async () => {
      const jsonrpc = JSON.parse(
        '{"jsonrpc":"2.0","id":"37a82bc9-27a5-4e28-a229-6d3c9420dcac","method":"signalwire.event","params":{"params":{"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","layout":{"layers":[],"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","name":"4x4"}},"timestamp":1627374719.3799,"event_type":"video.layout.changed","event_channel":"room.0a324e3c-5e2f-443a-a333-10bf005f249e"}}'
      )
      let runSaga = true
      const session = {
        relayProtocol: jsonrpc.params.protocol,
      } as any
      const pubSubChannel = createPubSubChannel()
      const swEventChannel = createSwEventChannel()
      const sessionChannel = eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []
      const payload = JSON.parse(
        '{"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","layout":{"layers":[],"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","name":"4x4"}}'
      )

      return expectSaga(sessionChannelWatcher, {
        session,
        pubSubChannel,
        swEventChannel,
        sessionChannel,
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === sessionChannel) {
                runSaga = false
                return socketMessageAction(jsonrpc)
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
          type: 'video.layout.changed',
          payload,
        })
        .run()
        .finally(() => {
          expect(dispatchedActions).toHaveLength(2)
        })
    })

    it('should handle video.member.joined without parent_id', async () => {
      const jsonrpc = JSON.parse(
        '{"jsonrpc":"2.0","id":"8719c452-fd1d-4fc6-aea8-d517caac70ed","method":"signalwire.event","params":{"params":{"room_session_id":"313bedbe-edc9-4653-b332-34fbf43e8289","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","member":{"visible":false,"room_session_id":"313bedbe-edc9-4653-b332-34fbf43e8289","input_volume":0,"id":"b8912cc5-4248-4345-b53c-d53b2761748d","scope_id":"e85c456f-1bf6-4e4c-8e8b-ee1f004226e5","input_sensitivity":200,"output_volume":0,"audio_muted":false,"on_hold":false,"name":"Edo","deaf":false,"video_muted":false,"room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","type":"member"}},"timestamp":1627391485.1266,"event_type":"video.member.joined","event_channel":"room.ed1a0eb0-1e8e-44ca-88f9-7f89a6cfc9c7"}}'
      )
      let runSaga = true
      const session = {
        relayProtocol: jsonrpc.params.protocol,
      } as any
      const pubSubChannel = createPubSubChannel()
      const swEventChannel = createSwEventChannel()
      const sessionChannel = eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []

      return expectSaga(sessionChannelWatcher, {
        session,
        pubSubChannel,
        swEventChannel,
        sessionChannel,
      })
        .provide([
          {
            take({ channel }, next) {
              if (runSaga && channel === sessionChannel) {
                runSaga = false
                return socketMessageAction(jsonrpc)
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
          type: 'video.member.joined',
          payload: jsonrpc.params.params,
        })
        .run()
        .finally(() => {
          expect(dispatchedActions).toHaveLength(2)
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
