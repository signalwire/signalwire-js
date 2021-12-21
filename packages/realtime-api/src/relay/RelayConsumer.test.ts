import WS from 'jest-websocket-mock'
import { RelayConsumer } from './RelayConsumer'

describe('RelayConsumer Object', () => {
  const host = 'ws://localhost:9876'
  let server: WS

  beforeEach(() => {
    server = new WS(host)

    server.on('connection', (socket) => {
      socket.on('message', (data: any) => {
        const request = JSON.parse(data)

        socket.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: request.id,
            result: {},
          })
        )
      })
    })
  })

  afterEach(() => {
    WS.clean()
  })

  it('should invoke setup and ready callbacks', async () => {
    const setup = jest.fn()
    const ready = jest.fn()
    const consumer = new RelayConsumer({
      host,
      project: 'project',
      token: 'token',
      contexts: ['office'],
      setup,
      ready,
    })

    await consumer.run()

    expect(setup).toHaveBeenCalledTimes(1)
    expect(ready).toHaveBeenCalledTimes(1)
  })

  it('should invoke onTask callback with the correct argument', async () => {
    const onTask = jest.fn()
    const consumer = new RelayConsumer({
      host,
      project: 'project',
      token: 'token',
      contexts: ['office'],
      onTask,
    })
    await consumer.run()

    const task =
      '{"jsonrpc":"2.0","id":"d42a7c46-c6c7-4f56-b52d-c1cbbcdc8125","method":"signalwire.event","params":{"space_id":"f6e0ee46-4bd4-4856-99bb-0f3bc3d3e787","project_id":"78429ef1-283b-4fa9-8ebc-16b59f95bb1f","context":"office","message":{"hello":"world"},"timestamp":1640022359,"event_type":"queuing.relay.tasks"}}'
    server.send(task)

    expect(onTask).toHaveBeenCalledTimes(1)
    expect(onTask).toHaveBeenCalledWith({ hello: 'world' })
  })
})
