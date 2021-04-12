import WS from 'jest-websocket-mock'

import { Session } from './Session'
import { BladeConnect } from './RPCMessages'

jest.mock('uuid', () => {
  return {
    v4: jest.fn(() => 'mocked-uuid'),
  }
})

describe('Session', () => {
  const host = 'ws://localhost:8080'
  const project = '2506edbc-35c4-4d9f-a5f0-45a03d82dab1'
  const token = 'PT1234abc'
  const bladeConnect = BladeConnect({
    authentication: {
      project,
      token,
    },
    params: {},
  })

  let ws: WS
  let client: Session
  beforeEach(() => {
    ws = new WS(host)
    client = new Session({
      host,
      project,
      token,
    })
    client.WebSocketConstructor = WebSocket
  })
  afterEach(() => {
    WS.clean()
  })

  it('should connect connect and disconnect to/from the provided host', async () => {
    client.connect()
    await ws.connected

    expect(client.connected).toBe(true)

    client.disconnect()

    expect(client.connected).toBe(false)
    expect(client.closed).toBe(true)
  })

  it('should send blade.connect with normal token on socket open', async () => {
    client.connect()
    await ws.connected

    await expect(ws).toReceiveMessage(JSON.stringify(bladeConnect))
  })
})
