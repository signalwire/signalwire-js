import WS from 'jest-websocket-mock'

import { JWTSession } from './JWTSession'
import { BladeConnect } from './RPCMessages'

jest.mock('uuid', () => {
  return {
    v4: jest.fn(() => 'mocked-uuid'),
  }
})

describe('JWTSession', () => {
  const host = 'ws://localhost:8080'
  const token = '<jwt>'
  const bladeConnect = BladeConnect({
    authentication: {
      jwt_token: token,
    },
    params: {},
  })

  let ws: WS
  let client: JWTSession
  beforeEach(() => {
    ws = new WS(host)
    client = new JWTSession({
      host,
      token,
    })
    client.dispatch = jest.fn()
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

  it('should send blade.connect with jwt_token on socket open', async () => {
    client.connect()
    await ws.connected

    await expect(ws).toReceiveMessage(JSON.stringify(bladeConnect))
  })
})
