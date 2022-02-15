import WS from 'jest-websocket-mock'
import { RelayConsumer } from './RelayConsumer'
import LegacyCall from '@signalwire/node/dist/common/src/relay/calling/Call'

describe('RoomSession Object', () => {
  const host = 'ws://localhost:1234'
  let server: WS
  let consumer: RelayConsumer

  beforeEach(async () => {
    server = new WS(host)
    server.on('connection', (socket: any) => {
      socket.on('message', (data: any) => {
        const parsedData = JSON.parse(data)
        socket.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: parsedData.id,
            result: {},
          })
        )
      })
    })
  })

  afterEach(() => {
    WS.clean()
    consumer.client.disconnect()
  })

  it('should receive an inbound call on onIncomingCall callback', (done) => {
    const callId = '08219786-e1a4-48b1-bda0-e3602c8fc84c'
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
              from_number: '+12222222222',
              to_number: '+10000000000',
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

        done()
      },
    })

    consumer.run().then(() => {
      server.send(swEvent)
    })
  })
})
