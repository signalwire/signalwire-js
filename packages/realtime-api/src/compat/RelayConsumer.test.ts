import WS from 'jest-websocket-mock'
import { ExecuteParams } from '@signalwire/core'
import LegacyCall from '@signalwire/node/dist/common/src/relay/calling/Call'
import { RelayConsumer } from './RelayConsumer'

describe('RoomSession Object', () => {
  const host = 'ws://localhost:1234'
  let server: WS
  let consumer: RelayConsumer

  type CallbackMap = Map<string, Function>

  const setupWS = (callbackMap: CallbackMap = new Map()) => {
    WS.clean()
    server = new WS(host)
    server.on('connection', (socket: any) => {
      socket.on('message', (data: any) => {
        const request = JSON.parse(data)

        if (request.method && callbackMap.has(request.method)) {
          callbackMap.get(request.method)?.(request)
        }

        socket.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: request.id,
            result: {},
          })
        )
      })
    })
  }

  beforeEach(() => {
    setupWS()
  })

  afterEach(() => {
    WS.clean()
    consumer.client.disconnect()
  })

  it('should handle the calling.call.receive event', (done) => {
    const callId = '08219786-e1a4-48b1-bda0-e3602c8fc84c'
    const fromNumber = '+12222222222'
    const toNumber = '+10000000000'
    const swEvent = JSON.stringify({
      jsonrpc: '2.0',
      id: '75673c0c-afa3-446f-9a74-1390ddbcb48d',
      method: 'signalwire.event',
      params: {
        event_type: 'calling.call.receive',
        timestamp: 1644582753.297892,
        project_id: 'project_id',
        space_id: 'space_id',
        params: {
          call_state: 'created',
          context: 'office',
          device: {
            type: 'phone',
            params: {
              from_number: fromNumber,
              to_number: toNumber,
            },
          },
          direction: 'inbound',
          call_id: callId,
          node_id: 'b650f7ba-249d-4a8f-907b-d6e71eef8557@us-east',
          segment_id: '08219786-e1a4-48b1-bda0-e3602c8fc84c',
        },
        context: 'office',
      },
    })

    consumer = new RelayConsumer({
      host,
      project: 'project',
      token: 'token',
      contexts: ['office'],
      onIncomingCall: (relayCall: LegacyCall) => {
        expect(relayCall).toBeInstanceOf(LegacyCall)
        expect(relayCall.id).toBe(callId)
        expect(relayCall.from).toBe(fromNumber)
        expect(relayCall.to).toBe(toNumber)

        done()
      },
    })

    consumer.run().then(() => {
      server.send(swEvent)
    })
  })

  it('should handle the calling.call.state event', (done) => {
    const callbacks: CallbackMap = new Map()
    callbacks.set('calling.dial', ({ params }: ExecuteParams) => {
      // Pick tag from the request
      const { tag } = params

      // Mock call dialing and created events
      server.send(callingDialStateEvent({ dialState: 'dialing', tag }))
      server.send(callingCallStateEvent({ callState: 'created', tag }))

      // Mock answered events
      server.send(callingDialStateEvent({ dialState: 'answered', tag }))
      server.send(callingCallStateEvent({ callState: 'answered', tag }))

      // Mock ending/ended events
      server.send(callingCallStateEvent({ callState: 'ending', tag }))
      server.send(callingCallStateEvent({ callState: 'ended', tag }))
    })
    setupWS(callbacks)

    const callId = '08219786-e1a4-48b1-bda0-e3602c8fc84c'
    const fromNumber = '+12222222222'
    const toNumber = '+10000000000'
    const callingCallStateEvent = ({
      callState,
      tag,
    }: {
      callState: string
      tag: string
    }) => {
      return JSON.stringify({
        jsonrpc: '2.0',
        id: '1884328d-8dd2-484b-a2bf-ea4aade41ab4',
        method: 'signalwire.event',
        params: {
          event_type: 'calling.call.state',
          event_channel: 'event_channel',
          timestamp: 1644924506.661171,
          project_id: 'project_id',
          space_id: 'space_id',
          params: {
            call_id: callId,
            node_id: 'node_id',
            segment_id: callId,
            tag: tag,
            call_state: callState,
            direction: 'outbound',
            device: {
              type: 'phone',
              params: {
                from_number: fromNumber,
                to_number: toNumber,
              },
            },
          },
        },
      })
    }

    const callingDialStateEvent = ({
      dialState,
      tag,
    }: {
      dialState: string
      tag: string
    }) => {
      if (dialState === 'answered') {
        return JSON.stringify({
          jsonrpc: '2.0',
          id: 'b6228dca-2b74-46df-ac86-a56ac6ba57ad',
          method: 'signalwire.event',
          params: {
            event_type: 'calling.call.dial',
            event_channel: 'event_channel',
            timestamp: 1644924508.001173,
            project_id: 'project_id',
            space_id: 'space_id',
            params: {
              tag: tag,
              node_id: 'node_id',
              dial_state: 'answered',
              call: {
                call_id: callId,
                node_id: 'node_id',
                segment_id: callId,
                tag: tag,
                call_state: 'answered',
                direction: 'outbound',
                device: {
                  type: 'phone',
                  params: {
                    from_number: fromNumber,
                    to_number: toNumber,
                  },
                },
                dial_winner: 'true',
              },
            },
          },
        })
      }

      return JSON.stringify({
        jsonrpc: '2.0',
        id: '8b959dd8-6d26-4076-9a55-c27ea130c824',
        method: 'signalwire.event',
        params: {
          event_type: 'calling.call.dial',
          event_channel: 'event_channel',
          timestamp: 1644924506.661171,
          project_id: 'project_id',
          params: {
            tag: tag,
            node_id: 'node_id',
            dial_state: dialState,
          },
        },
      })
    }

    consumer = new RelayConsumer({
      host,
      project: 'project',
      token: 'token',
      contexts: ['office'],
      ready: async (consumer: RelayConsumer) => {
        const params = { type: 'phone', from: fromNumber, to: toNumber }
        const { successful, call } = await consumer.client.calling.dial(params)

        expect(successful).toBe(true)

        await call.waitForEnding()
        await call.waitForEnded()

        expect(call.state).toBe('ended')
        done()
      },
    })

    consumer.run()
  })
})
