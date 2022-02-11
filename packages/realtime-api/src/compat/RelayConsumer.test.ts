import WS from 'jest-websocket-mock'
// import { actions } from '@signalwire/core'
// import { configureFullStack } from '../testUtils'
import { RelayConsumer } from './RelayConsumer'

describe('RoomSession Object', () => {
  const host = 'ws://localhost:1234'
  let server: WS
  let consumer: RelayConsumer

  // const { store, session, emitter } = configureFullStack()

  const dispatchCallingCallReceive = () => {
    const swEvent = JSON.stringify({
      jsonrpc: '2.0',
      id: '75673c0c-afa3-446f-9a74-1390ddbcb48d',
      method: 'signalwire.event',
      params: {
        event_type: 'calling.call.receive',
        timestamp: 1644582753.297892,
        project_id: '4b7ae78a-d02e-4889-a63b-08b156d5916e',
        space_id: '62615f44-2a34-4235-b38b-76b5a1de6ef8',
        params: {
          call_state: 'created',
          context: 'office',
          device: {
            type: 'phone',
            params: { from_number: '+15183601338', to_number: '+12062371092' },
          },
          direction: 'inbound',
          call_id: '08219786-e1a4-48b1-bda0-e3602c8fc84c',
          node_id: 'b650f7ba-249d-4a8f-907b-d6e71eef8557@us-east',
          segment_id: '08219786-e1a4-48b1-bda0-e3602c8fc84c',
        },
        context: 'office',
      },
    })
    // session.dispatch(actions.socketMessageAction(swEvent))
    server.send(swEvent)
  }

  beforeEach(async () => {
    server = new WS(host)
    server.on('connection', (socket: any) => {
      socket.on('message', (data: any) => {
        const parsedData = JSON.parse(data)

        // if (
        //   parsedData.method === 'signalwire.connect' &&
        //   parsedData.params.authentication.token === '<invalid-token>'
        // ) {
        //   socket.send(
        //     JSON.stringify({
        //       jsonrpc: '2.0',
        //       id: parsedData.id,
        //       error: authError,
        //     })
        //   )
        // }

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

  it('should receive an inbound call on onIncomingCall callback', async () => {
    const mock = jest.fn()

    consumer = new RelayConsumer({
      host,
      project: 'project',
      token: 'token',
      contexts: ['office'],
      onIncomingCall: mock,
    })
    await consumer.run()
    await server.connected

    dispatchCallingCallReceive()

    expect(mock).toHaveBeenCalledTimes(1)
  })
})
