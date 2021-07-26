import { channel, eventChannel } from 'redux-saga'
import { expectSaga } from 'redux-saga-test-plan'
import { VertoResult } from '../../../RPCMessages'
import { socketMessageAction, executeAction } from '../../actions'
import { componentActions } from '../'
import { sessionChannelWatcher, createSessionChannel } from './sessionSaga'

describe('sessionChannelWatcher', () => {
  describe('videoAPIWorker', () => {
    it('should handle room.subscribed dispatching componentActions.upsert and the room.joined', async () => {
      const jsonrpc = JSON.parse(
        '{"jsonrpc":"2.0","id":"ddcd9807-0339-4a39-92b1-ab7967b84782","method":"signalwire.event","params":{"broadcaster_nodeid":"2286cac8-1346-474f-9913-7ca9c3df9fc8@west-us","protocol":"signalwire_0d8d431757079b56923f7a2acc25ef69e3f698dd36689ca472cf6bc0fd900426_830b7622-b03b-4a11-9109-19bf2c9e27cf_78429ef1-283b-4fa9-8ebc-16b59f95bb1f","channel":"notifications","event":"conference","params":{"params":{"room":{"room_session_id":"6fbe4472-e6dd-431f-887f-33171cd83ccb","name":"roomName","members":[{"visible":false,"id":"0e5f67e0-8dbf-48dd-b920-804b97fccee6","audio_muted":false,"name":"Edo","video_muted":false,"type":"member"}],"locked":false,"layouts":[{"id":"group:grid"}],"room_id":"790d6c79-f0d1-421e-b5f2-f09bd05941ce","current_layout":{"id":"1x1","layers":[{"y":0,"x":0,"layer_index":0,"height":720,"z_index":0,"width":1280}],"name":"Full Screen"}},"call_id":"0e5f67e0-8dbf-48dd-b920-804b97fccee6","member_id":"0e5f67e0-8dbf-48dd-b920-804b97fccee6"},"timestamp":"1620991212.326279","event_type":"room.subscribed","event_channel":"room.adaacbef-3d34-4a5f-a123-d3d166515ba0"}},"hops":[]}'
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
        '{"jsonrpc":"2.0","id":"02f22650-8601-4e7d-bd1d-d084e69f22b0","method":"signalwire.event","params":{"broadcaster_nodeid":"2286cac8-1346-474f-9913-7ca9c3df9fc8@west-us","protocol":"signalwire_0d8d431757079b56923f7a2acc25ef69e3f698dd36689ca472cf6bc0fd900426_2e393a80-fafe-4d73-9553-85bbf16b3a89_78429ef1-283b-4fa9-8ebc-16b59f95bb1f","channel":"notifications","event":"conference","params":{"params":{"member":{"updated":["video_muted","visible"],"id":"ab42641c-e784-42f1-9815-d264105bc24f","visible":true,"video_muted":false}},"timestamp":"1620984182.577089","event_type":"member.updated","event_channel":"room.e1c5fc18-f96d-4696-bf9b-bcb2eab57906"}},"hops":[]}'
      )
      let runSaga = true
      const session = {
        relayProtocol: jsonrpc.params.protocol,
      } as any
      const pubSubChannel = channel()
      const sessionChannel = eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []
      const payload = JSON.parse(
        '{"member":{"updated":["video_muted","visible"],"id":"ab42641c-e784-42f1-9815-d264105bc24f","visible":true,"video_muted":false}}'
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

    it('should handle member.talking and emit member.talking.start when talking: true', () => {
      const jsonrpc = JSON.parse(
        '{"jsonrpc":"2.0","id":"6d0e46b2-77af-4734-8691-866f09b37ff3","method":"signalwire.event","params":{"broadcaster_nodeid":"6a088ac7-9c9b-48c2-a5a1-92aafb70b0ab@west-us","protocol":"signalwire_519264e7f1beedc770d250eabcf50c4ae3bc197dccb6886ed1677ddb4bce8518_b0f0c4e0-e5cb-4ee8-befa-f246ea69b54e_78429ef1-283b-4fa9-8ebc-16b59f95bb1f","channel":"notifications","event":"conference","params":{"params":{"member":{"id":"a3693340-6f42-4cab-b18e-8e2a22695698","talking":true}},"timestamp":1624014381.1524,"event_type":"member.talking","event_channel":"room.b0e1b577-f5e7-4337-b7c4-06fa993b1a19"}},"hops":[]}'
      )
      let runSaga = true
      const session = {
        relayProtocol: jsonrpc.params.protocol,
      } as any
      const pubSubChannel = channel()
      const sessionChannel = eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []
      const payload = JSON.parse(
        '{"member":{"id":"a3693340-6f42-4cab-b18e-8e2a22695698","talking":true}}'
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
          type: 'member.talking.start',
          payload,
        })
        .put(pubSubChannel, {
          type: 'member.talking',
          payload,
        })
        .run()
        .finally(() => {
          expect(dispatchedActions).toHaveLength(2)
        })
    })

    it('should emit member.talking.stop on member.talking with talking: false', () => {
      const jsonrpc = JSON.parse(
        '{"jsonrpc":"2.0","id":"6d0e46b2-77af-4734-8691-866f09b37ff3","method":"signalwire.event","params":{"broadcaster_nodeid":"6a088ac7-9c9b-48c2-a5a1-92aafb70b0ab@west-us","protocol":"signalwire_519264e7f1beedc770d250eabcf50c4ae3bc197dccb6886ed1677ddb4bce8518_b0f0c4e0-e5cb-4ee8-befa-f246ea69b54e_78429ef1-283b-4fa9-8ebc-16b59f95bb1f","channel":"notifications","event":"conference","params":{"params":{"member":{"id":"a3693340-6f42-4cab-b18e-8e2a22695698","talking":false}},"timestamp":1624014381.1524,"event_type":"member.talking","event_channel":"room.b0e1b577-f5e7-4337-b7c4-06fa993b1a19"}},"hops":[]}'
      )
      let runSaga = true
      const session = {
        relayProtocol: jsonrpc.params.protocol,
      } as any
      const pubSubChannel = channel()
      const sessionChannel = eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []
      const payload = JSON.parse(
        '{"member":{"id":"a3693340-6f42-4cab-b18e-8e2a22695698","talking":false}}'
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
          type: 'member.talking.stop',
          payload,
        })
        .put(pubSubChannel, {
          type: 'member.talking',
          payload,
        })
        .run()
        .finally(() => {
          expect(dispatchedActions).toHaveLength(2)
        })
    })

    it('should emit event_type and nested params on the pubSubChannel', async () => {
      const jsonrpc = JSON.parse(
        '{"jsonrpc":"2.0","id":"6d0e46b2-77af-4734-8691-866f09b37ff3","method":"signalwire.event","params":{"broadcaster_nodeid":"6a088ac7-9c9b-48c2-a5a1-92aafb70b0ab@west-us","protocol":"proto","channel":"notifications","event":"conference","params":{"params":"random value","timestamp":1624014381.1524,"event_type":"testing","event_channel":"room.b0e1b577-f5e7-4337-b7c4-06fa993b1a19"}},"hops":[]}'
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
          type: 'testing',
          payload: 'random value',
        })
        .run()
        .finally(() => {
          expect(dispatchedActions).toHaveLength(1)
        })
    })
  })

  describe('vertoWorker', () => {
    describe('verto.media', () => {
      it('should handle verto.media event without SDP', () => {
        const jsonrpc = JSON.parse(
          '{"jsonrpc":"2.0","id":"515a2796-4020-4689-aeaf-e2d9c79e7025","method":"signalwire.event","params":{"broadcaster_nodeid":"2286cac8-1346-474f-9913-7ca9c3df9fc8@west-us","protocol":"signalwire_19d453176877c268bcde383fed0fec20cb3f2bd39a47b4b96c54ff3ca3cd16c4_341e4715-9c98-4565-9378-789542b5896f_78429ef1-283b-4fa9-8ebc-16b59f95bb1f","channel":"notifications","event":"queuing.relay.events","params":{"event_type":"webrtc.message","event_channel":"signalwire_19d453176877c268bcde383fed0fec20cb3f2bd39a47b4b96c54ff3ca3cd16c4_341e4715-9c98-4565-9378-789542b5896f_78429ef1-283b-4fa9-8ebc-16b59f95bb1f","timestamp":1621326334.602761,"project_id":"78429ef1-283b-4fa9-8ebc-16b59f95bb1f","node_id":"44c606b1-b951-4959-810a-ffa1ddc9ac4f@","params":{"jsonrpc":"2.0","id":"40","method":"verto.media","params":{"callID":"66e4b610-8d26-4835-8bd8-7022a42ee9bc","sdp":"MEDIA-SDP"}}}},"hops":[]}'
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
          '{"jsonrpc":"2.0","id":"6a1113a5-ad37-415a-bb82-442fe391eb71","method":"signalwire.event","params":{"broadcaster_nodeid":"2286cac8-1346-474f-9913-7ca9c3df9fc8@west-us","protocol":"signalwire_19d453176877c268bcde383fed0fec20cb3f2bd39a47b4b96c54ff3ca3cd16c4_67cd19ab-0daf-4a94-9ec4-d794d618f424_78429ef1-283b-4fa9-8ebc-16b59f95bb1f","channel":"notifications","event":"queuing.relay.events","params":{"event_type":"webrtc.message","event_channel":"signalwire_19d453176877c268bcde383fed0fec20cb3f2bd39a47b4b96c54ff3ca3cd16c4_67cd19ab-0daf-4a94-9ec4-d794d618f424_78429ef1-283b-4fa9-8ebc-16b59f95bb1f","timestamp":1621289013.528754,"project_id":"78429ef1-283b-4fa9-8ebc-16b59f95bb1f","node_id":"44c606b1-b951-4959-810a-ffa1ddc9ac4f@","params":{"jsonrpc":"2.0","id":"34","method":"verto.answer","params":{"callID":"2146cdbf-de67-4474-83e2-323520148d6a"}}}},"hops":[]}'
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
          '{"jsonrpc":"2.0","id":"6a1113a5-ad37-415a-bb82-442fe391eb71","method":"signalwire.event","params":{"broadcaster_nodeid":"2286cac8-1346-474f-9913-7ca9c3df9fc8@west-us","protocol":"signalwire_19d453176877c268bcde383fed0fec20cb3f2bd39a47b4b96c54ff3ca3cd16c4_67cd19ab-0daf-4a94-9ec4-d794d618f424_78429ef1-283b-4fa9-8ebc-16b59f95bb1f","channel":"notifications","event":"queuing.relay.events","params":{"event_type":"webrtc.message","event_channel":"signalwire_19d453176877c268bcde383fed0fec20cb3f2bd39a47b4b96c54ff3ca3cd16c4_67cd19ab-0daf-4a94-9ec4-d794d618f424_78429ef1-283b-4fa9-8ebc-16b59f95bb1f","timestamp":1621289013.528754,"project_id":"78429ef1-283b-4fa9-8ebc-16b59f95bb1f","node_id":"44c606b1-b951-4959-810a-ffa1ddc9ac4f@","params":{"jsonrpc":"2.0","id":"34","method":"verto.answer","params":{"callID":"2146cdbf-de67-4474-83e2-323520148d6a","sdp":"SDP-HERE"}}}},"hops":[]}'
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
          '{"jsonrpc":"2.0","id":"515a2796-4020-4689-aeaf-e2d9c79e7025","method":"signalwire.event","params":{"broadcaster_nodeid":"2286cac8-1346-474f-9913-7ca9c3df9fc8@west-us","protocol":"signalwire_19d453176877c268bcde383fed0fec20cb3f2bd39a47b4b96c54ff3ca3cd16c4_341e4715-9c98-4565-9378-789542b5896f_78429ef1-283b-4fa9-8ebc-16b59f95bb1f","channel":"notifications","event":"queuing.relay.events","params":{"event_type":"webrtc.message","event_channel":"signalwire_19d453176877c268bcde383fed0fec20cb3f2bd39a47b4b96c54ff3ca3cd16c4_341e4715-9c98-4565-9378-789542b5896f_78429ef1-283b-4fa9-8ebc-16b59f95bb1f","timestamp":1621326334.602761,"project_id":"78429ef1-283b-4fa9-8ebc-16b59f95bb1f","node_id":"44c606b1-b951-4959-810a-ffa1ddc9ac4f@","params":{"jsonrpc":"2.0","id":"40","method":"verto.bye","params":{"callID":"66e4b610-8d26-4835-8bd8-7022a42ee9bc","cause":"NORMAL_CLEARING","causeCode":16}}}},"hops":[]}'
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
          '{"jsonrpc":"2.0","id":"515a2796-4020-4689-aeaf-e2d9c79e7025","method":"signalwire.event","params":{"broadcaster_nodeid":"2286cac8-1346-474f-9913-7ca9c3df9fc8@west-us","protocol":"signalwire_19d453176877c268bcde383fed0fec20cb3f2bd39a47b4b96c54ff3ca3cd16c4_341e4715-9c98-4565-9378-789542b5896f_78429ef1-283b-4fa9-8ebc-16b59f95bb1f","channel":"notifications","event":"queuing.relay.events","params":{"event_type":"webrtc.message","event_channel":"signalwire_19d453176877c268bcde383fed0fec20cb3f2bd39a47b4b96c54ff3ca3cd16c4_341e4715-9c98-4565-9378-789542b5896f_78429ef1-283b-4fa9-8ebc-16b59f95bb1f","timestamp":1621326334.602761,"project_id":"78429ef1-283b-4fa9-8ebc-16b59f95bb1f","node_id":"44c606b1-b951-4959-810a-ffa1ddc9ac4f@","params":{"jsonrpc":"2.0","id":"40","method":"verto.ping","params":{"serno":1}}}},"hops":[]}'
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
          '{"jsonrpc":"2.0","id":"515a2796-4020-4689-aeaf-e2d9c79e7025","method":"signalwire.event","params":{"broadcaster_nodeid":"2286cac8-1346-474f-9913-7ca9c3df9fc8@west-us","protocol":"signalwire_19d453176877c268bcde383fed0fec20cb3f2bd39a47b4b96c54ff3ca3cd16c4_341e4715-9c98-4565-9378-789542b5896f_78429ef1-283b-4fa9-8ebc-16b59f95bb1f","channel":"notifications","event":"queuing.relay.events","params":{"event_type":"webrtc.message","event_channel":"signalwire_19d453176877c268bcde383fed0fec20cb3f2bd39a47b4b96c54ff3ca3cd16c4_341e4715-9c98-4565-9378-789542b5896f_78429ef1-283b-4fa9-8ebc-16b59f95bb1f","timestamp":1621326334.602761,"project_id":"78429ef1-283b-4fa9-8ebc-16b59f95bb1f","node_id":"44c606b1-b951-4959-810a-ffa1ddc9ac4f@","params":{"jsonrpc":"2.0","id":"40","method":"verto.punt","params":{}}}},"hops":[]}'
        )
        let runSaga = true
        const session = {
          relayProtocol: jsonrpc.params.protocol,
          disconnect: jest.fn(),
        } as any
        const pubSubChannel = channel()
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
