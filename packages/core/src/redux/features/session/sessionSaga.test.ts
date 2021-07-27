import { eventChannel } from 'redux-saga'
import { expectSaga } from 'redux-saga-test-plan'
import { VertoResult } from '../../../RPCMessages'
import { socketMessageAction, executeAction } from '../../actions'
import { componentActions } from '../'
import { sessionChannelWatcher, createSessionChannel } from './sessionSaga'
import { createPubSubChannel } from '../../../testUtils'

describe('sessionChannelWatcher', () => {
  describe('videoAPIWorker', () => {
    it('should handle room.subscribed dispatching componentActions.upsert and the room.joined', async () => {
      const jsonrpc = JSON.parse(
        '{"jsonrpc":"2.0","id":"83cbf7d3-4364-454e-af84-6f1f9176901b","method":"signalwire.event","params":{"params":{"room":{"room_session_id":"6fbe4472-e6dd-431f-887f-33171cd83ccb","logos_visible":true,"members":[{"visible":false,"room_session_id":"6fbe4472-e6dd-431f-887f-33171cd83ccb","input_volume":0,"id":"0e5f67e0-8dbf-48dd-b920-804b97fccee6","input_sensitivity":200,"output_volume":0,"audio_muted":false,"on_hold":false,"name":"Edo","deaf":false,"video_muted":false,"room_id":"790d6c79-f0d1-421e-b5f2-f09bd05941ce","type":"member"}],"blind_mode":false,"recording":false,"silent_mode":false,"name":"edoRoom2","hide_video_muted":false,"locked":false,"meeting_mode":false,"room_id":"790d6c79-f0d1-421e-b5f2-f09bd05941ce","event_channel":"room.649c069f-c0a1-4cc8-9d6a-be642ad68eab"},"call_id":"0e5f67e0-8dbf-48dd-b920-804b97fccee6","member_id":"0e5f67e0-8dbf-48dd-b920-804b97fccee6"},"timestamp":1627373985.2656,"event_type":"video.room.subscribed","event_channel":"room.649c069f-c0a1-4cc8-9d6a-be642ad68eab"}}'
      )
      let runSaga = true
      const session = {
        relayProtocol: jsonrpc.params.protocol,
      } as any
      const pubSubChannel = createPubSubChannel()
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
            id: '0e5f67e0-8dbf-48dd-b920-804b97fccee6',
            roomId: '790d6c79-f0d1-421e-b5f2-f09bd05941ce',
            roomSessionId: '6fbe4472-e6dd-431f-887f-33171cd83ccb',
            memberId: '0e5f67e0-8dbf-48dd-b920-804b97fccee6',
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
          expect(dispatchedActions).toHaveLength(3)
        })
    })

    it('should handle member.updated dispatching the sub-events for what is changed for the user', async () => {
      const jsonrpc = JSON.parse(
        '{"jsonrpc":"2.0","id":"90e60fd9-a353-44dd-b179-4ce8f43b0cb1","method":"signalwire.event","params":{"params":{"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","member":{"updated":["visible","video_muted"],"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","id":"ab42641c-e784-42f1-9815-d264105bc24f","visible":true,"room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","video_muted":false}},"timestamp":1627374437.3696,"event_type":"video.member.updated","event_channel":"room.0a324e3c-5e2f-443a-a333-10bf005f249e"}}'
      )
      let runSaga = true
      const session = {
        relayProtocol: jsonrpc.params.protocol,
      } as any
      const pubSubChannel = createPubSubChannel()
      const sessionChannel = eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []
      const payload = JSON.parse(
        '{"member":{"updated":["visible","video_muted"],"id":"ab42641c-e784-42f1-9815-d264105bc24f","visible":true,"video_muted":false,"room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7"},"room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7"}'
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
          type: 'video.member.updated.visible',
          payload,
        })
        .put(pubSubChannel, {
          type: 'video.member.updated.video_muted',
          payload,
        })
        .put(pubSubChannel, {
          type: 'video.member.updated',
          payload,
        })
        .run()
        .finally(() => {
          expect(dispatchedActions).toHaveLength(3)
        })
    })

    it('should handle member.talking and emit member.talking.start when talking: true', () => {
      const jsonrpc = JSON.parse(
        '{"jsonrpc":"2.0","id":"9050e4f8-b08e-4e39-9796-bfb6e83c2a2d","method":"signalwire.event","params":{"params":{"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","member":{"id":"a3693340-6f42-4cab-b18e-8e2a22695698","room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","talking":true}},"timestamp":1627374612.9585,"event_type":"video.member.talking","event_channel":"room.0a324e3c-5e2f-443a-a333-10bf005f249e"}}'
      )
      let runSaga = true
      const session = {
        relayProtocol: jsonrpc.params.protocol,
      } as any
      const pubSubChannel = createPubSubChannel()
      const sessionChannel = eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []
      const payload = JSON.parse(
        '{"member":{"id":"a3693340-6f42-4cab-b18e-8e2a22695698","talking":true,"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426"},"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426"}'
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
          type: 'video.member.talking.start',
          payload,
        })
        .put(pubSubChannel, {
          type: 'video.member.talking',
          payload,
        })
        .run()
        .finally(() => {
          expect(dispatchedActions).toHaveLength(2)
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
      const sessionChannel = eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []
      const payload = JSON.parse(
        '{"member":{"id":"a3693340-6f42-4cab-b18e-8e2a22695698","talking":false,"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426"},"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426"}'
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
          type: 'video.member.talking.stop',
          payload,
        })
        .put(pubSubChannel, {
          type: 'video.member.talking',
          payload,
        })
        .run()
        .finally(() => {
          expect(dispatchedActions).toHaveLength(2)
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
      const sessionChannel = eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []
      const payload = JSON.parse(
        '{"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","layout":{"layers":[],"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","name":"4x4"}}'
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
          expect(dispatchedActions).toHaveLength(1)
        })
    })
  })

  describe('vertoWorker', () => {
    describe('verto.media', () => {
      it('should handle verto.media event with remote SDP', () => {
        const jsonrpc = JSON.parse(
          '{"jsonrpc":"2.0","id":"359bd626-98b0-436d-a0e5-2fce680f0bc2","method":"signalwire.event","params":{"event_type":"webrtc.message","event_channel":"signalwire_d71f0159c3734a51cd53e2c5e56e65a0b808e3e9865e561379c3af173aad3487_b3c11bb3-5b5f-4a22-820a-c8bd6d7fb10e_78429ef1-283b-4fa9-8ebc-16b59f95bb1f","timestamp":1627374894.010822,"project_id":"78429ef1-283b-4fa9-8ebc-16b59f95bb1f","node_id":"44c606b1-b951-4959-810a-ffa1ddc9ac4f@","params":{"jsonrpc":"2.0","id":"40","method":"verto.media","params":{"callID":"66e4b610-8d26-4835-8bd8-7022a42ee9bc","sdp":"MEDIA-SDP"}}}}'
        )
        let runSaga = true
        const session = {
          relayProtocol: jsonrpc.params.protocol,
        } as any
        const pubSubChannel = createPubSubChannel()
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
                  return socketMessageAction(jsonrpc)
                }
                sessionChannel.close()
                pubSubChannel.close()
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
              id: '66e4b610-8d26-4835-8bd8-7022a42ee9bc',
              state: 'early',
              remoteSDP: 'MEDIA-SDP',
              nodeId: '44c606b1-b951-4959-810a-ffa1ddc9ac4f@',
            })
          )
          .put(
            executeAction({
              method: 'video.message',
              params: {
                message: VertoResult('40', 'verto.media'),
                node_id: '44c606b1-b951-4959-810a-ffa1ddc9ac4f@',
              },
            })
          )
          .run()
          .finally(() => {
            expect(dispatchedActions).toHaveLength(2)
          })
      })
    })

    describe('verto.answer', () => {
      it('should handle verto.answer event without SDP', () => {
        const jsonrpc = JSON.parse(
          '{"jsonrpc":"2.0","id":"580a9555-ec98-4054-8288-859457da7797","method":"signalwire.event","params":{"event_type":"webrtc.message","event_channel":"signalwire_d71f0159c3734a51cd53e2c5e56e65a0b808e3e9865e561379c3af173aad3487_b3c11bb3-5b5f-4a22-820a-c8bd6d7fb10e_78429ef1-283b-4fa9-8ebc-16b59f95bb1f","timestamp":1627374894.011822,"project_id":"78429ef1-283b-4fa9-8ebc-16b59f95bb1f","node_id":"44c606b1-b951-4959-810a-ffa1ddc9ac4f@","params":{"jsonrpc":"2.0","id":"34","method":"verto.answer","params":{"callID":"2146cdbf-de67-4474-83e2-323520148d6a"}}}}'
        )
        let runSaga = true
        const session = {
          relayProtocol: jsonrpc.params.protocol,
        } as any
        const pubSubChannel = createPubSubChannel()
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
                  return socketMessageAction(jsonrpc)
                }
                sessionChannel.close()
                pubSubChannel.close()
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
              id: '2146cdbf-de67-4474-83e2-323520148d6a',
              state: 'active',
              nodeId: '44c606b1-b951-4959-810a-ffa1ddc9ac4f@',
            })
          )
          .put(
            executeAction({
              method: 'video.message',
              params: {
                message: VertoResult('34', 'verto.answer'),
                node_id: '44c606b1-b951-4959-810a-ffa1ddc9ac4f@',
              },
            })
          )
          .run()
          .finally(() => {
            expect(dispatchedActions).toHaveLength(2)
          })
      })

      it('should handle verto.answer event with SDP', () => {
        const jsonrpc = JSON.parse(
          '{"jsonrpc":"2.0","id":"580a9555-ec98-4054-8288-859457da7797","method":"signalwire.event","params":{"event_type":"webrtc.message","event_channel":"signalwire_d71f0159c3734a51cd53e2c5e56e65a0b808e3e9865e561379c3af173aad3487_b3c11bb3-5b5f-4a22-820a-c8bd6d7fb10e_78429ef1-283b-4fa9-8ebc-16b59f95bb1f","timestamp":1627374894.011822,"project_id":"78429ef1-283b-4fa9-8ebc-16b59f95bb1f","node_id":"44c606b1-b951-4959-810a-ffa1ddc9ac4f@","params":{"jsonrpc":"2.0","id":"34","method":"verto.answer","params":{"callID":"2146cdbf-de67-4474-83e2-323520148d6a","sdp":"SDP-HERE"}}}}'
        )
        let runSaga = true
        const session = {
          relayProtocol: jsonrpc.params.protocol,
        } as any
        const pubSubChannel = createPubSubChannel()
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
                  return socketMessageAction(jsonrpc)
                }
                sessionChannel.close()
                pubSubChannel.close()
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
              id: '2146cdbf-de67-4474-83e2-323520148d6a',
              state: 'active',
              remoteSDP: 'SDP-HERE',
              nodeId: '44c606b1-b951-4959-810a-ffa1ddc9ac4f@',
            })
          )
          .put(
            executeAction({
              method: 'video.message',
              params: {
                message: VertoResult('34', 'verto.answer'),
                node_id: '44c606b1-b951-4959-810a-ffa1ddc9ac4f@',
              },
            })
          )
          .run()
          .finally(() => {
            expect(dispatchedActions).toHaveLength(2)
          })
      })
    })

    describe('verto.bye', () => {
      it('should handle verto.bye event', () => {
        const jsonrpc = JSON.parse(
          '{"jsonrpc":"2.0","id":"580a9555-ec98-4054-8288-859457da7797","method":"signalwire.event","params":{"event_type":"webrtc.message","event_channel":"signalwire_d71f0159c3734a51cd53e2c5e56e65a0b808e3e9865e561379c3af173aad3487_b3c11bb3-5b5f-4a22-820a-c8bd6d7fb10e_78429ef1-283b-4fa9-8ebc-16b59f95bb1f","timestamp":1627374894.011822,"project_id":"78429ef1-283b-4fa9-8ebc-16b59f95bb1f","node_id":"44c606b1-b951-4959-810a-ffa1ddc9ac4f@","params":{"jsonrpc":"2.0","id":"40","method":"verto.bye","params":{"callID":"66e4b610-8d26-4835-8bd8-7022a42ee9bc","cause":"NORMAL_CLEARING","causeCode":16}}}}'
        )
        let runSaga = true
        const session = {
          relayProtocol: jsonrpc.params.protocol,
        } as any
        const pubSubChannel = createPubSubChannel()
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
                  return socketMessageAction(jsonrpc)
                }
                sessionChannel.close()
                pubSubChannel.close()
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
              id: '66e4b610-8d26-4835-8bd8-7022a42ee9bc',
              state: 'hangup',
              byeCause: 'NORMAL_CLEARING',
              byeCauseCode: 16,
              redirectDestination: undefined,
              nodeId: '44c606b1-b951-4959-810a-ffa1ddc9ac4f@',
            })
          )
          .put(
            executeAction({
              method: 'video.message',
              params: {
                message: VertoResult('40', 'verto.bye'),
                node_id: '44c606b1-b951-4959-810a-ffa1ddc9ac4f@',
              },
            })
          )
          .run()
          .finally(() => {
            expect(dispatchedActions).toHaveLength(2)
          })
      })
    })

    describe('verto.ping', () => {
      it('should handle verto.ping event', () => {
        const jsonrpc = JSON.parse(
          '{"jsonrpc":"2.0","id":"580a9555-ec98-4054-8288-859457da7797","method":"signalwire.event","params":{"event_type":"webrtc.message","event_channel":"signalwire_d71f0159c3734a51cd53e2c5e56e65a0b808e3e9865e561379c3af173aad3487_b3c11bb3-5b5f-4a22-820a-c8bd6d7fb10e_78429ef1-283b-4fa9-8ebc-16b59f95bb1f","timestamp":1627374894.011822,"project_id":"78429ef1-283b-4fa9-8ebc-16b59f95bb1f","node_id":"44c606b1-b951-4959-810a-ffa1ddc9ac4f@","params":{"jsonrpc":"2.0","id":"40","method":"verto.ping","params":{"serno":1}}}}'
        )
        let runSaga = true
        const session = {
          relayProtocol: jsonrpc.params.protocol,
        } as any
        const pubSubChannel = createPubSubChannel()
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
                  return socketMessageAction(jsonrpc)
                }
                sessionChannel.close()
                pubSubChannel.close()
                return next()
              },
              put(action, next) {
                dispatchedActions.push(action)
                return next()
              },
            },
          ])
          .put(
            executeAction({
              method: 'video.message',
              params: {
                message: VertoResult('40', 'verto.ping'),
                node_id: '44c606b1-b951-4959-810a-ffa1ddc9ac4f@',
              },
            })
          )
          .run()
          .finally(() => {
            expect(dispatchedActions).toHaveLength(1)
          })
      })
    })

    describe('verto.punt', () => {
      it('should invoke session.disconnect', () => {
        const jsonrpc = JSON.parse(
          '{"jsonrpc":"2.0","id":"580a9555-ec98-4054-8288-859457da7797","method":"signalwire.event","params":{"event_type":"webrtc.message","event_channel":"signalwire_d71f0159c3734a51cd53e2c5e56e65a0b808e3e9865e561379c3af173aad3487_b3c11bb3-5b5f-4a22-820a-c8bd6d7fb10e_78429ef1-283b-4fa9-8ebc-16b59f95bb1f","timestamp":1627374894.011822,"project_id":"78429ef1-283b-4fa9-8ebc-16b59f95bb1f","node_id":"44c606b1-b951-4959-810a-ffa1ddc9ac4f@","params":{"jsonrpc":"2.0","id":40,"method":"verto.punt","params":{}}}}'
        )
        let runSaga = true
        const session = {
          relayProtocol: jsonrpc.params.protocol,
          disconnect: jest.fn(),
        } as any
        const pubSubChannel = createPubSubChannel()
        const sessionChannel = eventChannel(() => () => {})

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
                  return socketMessageAction(jsonrpc)
                }
                sessionChannel.close()
                pubSubChannel.close()
                return next()
              },
            },
          ])
          .run()
          .finally(() => {
            expect(session.disconnect).toHaveBeenCalledTimes(1)
          })
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
