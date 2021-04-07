import WS from 'jest-websocket-mock'

import { JWTSession } from './JWTSession'

const HOST = 'ws://localhost:8080'

let ws: WS
beforeEach(() => {
  ws = new WS(HOST)
})
afterEach(() => {
  WS.clean()
})

describe('JWTSession', () => {
  it('should connect connect and disconnect to/from the provided host', async () => {
    const client = new JWTSession({
      host: HOST,
      project: 'asd',
      token: 'sometoken',
    })

    client.connect()
    await ws.connected

    expect(client.connected).toBe(true)

    client.disconnect()

    expect(client.connected).toBe(false)
    expect(client.closed).toBe(true)
  })
})
