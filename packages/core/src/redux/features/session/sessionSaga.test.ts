import { eventChannel } from '@redux-saga/core'
import { expectSaga } from 'redux-saga-test-plan'
import { socketMessageAction } from '../../actions'
import { sessionChannelWatcher, createSessionChannel } from './sessionSaga'
import { createPubSubChannel, createSwEventChannel } from '../../../testUtils'

jest.mock('uuid', () => {
  return {
    v4: jest.fn(() => 'mocked-uuid'),
  }
})

describe('sessionChannelWatcher', () => {
  describe('videoAPIWorker', () => {
    it('should handle video.member.talking and emit member.talking.start when talking: true', () => {
      const jsonrpc = JSON.parse(
        '{"jsonrpc":"2.0","id":"9050e4f8-b08e-4e39-9796-bfb6e83c2a2d","method":"signalwire.event","params":{"params":{"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","member":{"id":"a3693340-6f42-4cab-b18e-8e2a22695698","room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","talking":true}},"timestamp":1627374612.9585,"event_type":"video.member.talking","event_channel":"room.0a324e3c-5e2f-443a-a333-10bf005f249e"}}'
      )
      let runSaga = true
      const pubSubChannel = createPubSubChannel()
      const swEventChannel = createSwEventChannel()
      const sessionChannel = eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []
      const payload = JSON.parse(
        '{"member":{"id":"a3693340-6f42-4cab-b18e-8e2a22695698","talking":true,"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426"},"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426"}'
      )

      return expectSaga(sessionChannelWatcher, {
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
      const pubSubChannel = createPubSubChannel()
      const swEventChannel = createSwEventChannel()
      const sessionChannel = eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []
      const payload = JSON.parse(
        '{"member":{"id":"a3693340-6f42-4cab-b18e-8e2a22695698","talking":false,"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426"},"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426"}'
      )

      return expectSaga(sessionChannelWatcher, {
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
      const pubSubChannel = createPubSubChannel()
      const swEventChannel = createSwEventChannel()
      const sessionChannel = eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []
      const payload = JSON.parse(
        '{"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","layout":{"layers":[],"room_session_id":"8e03ac25-8622-411a-95fc-f897b34ac9e7","room_id":"6e83849b-5cc2-4fc6-80ed-448113c8a426","name":"4x4"}}'
      )

      return expectSaga(sessionChannelWatcher, {
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
      const pubSubChannel = createPubSubChannel()
      const swEventChannel = createSwEventChannel()
      const sessionChannel = eventChannel(() => () => {})
      const dispatchedActions: unknown[] = []

      return expectSaga(sessionChannelWatcher, {
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
