import WS from 'jest-websocket-mock'

import { JWTSession } from './JWTSession'
import { BladeConnect } from './RPCMessages'

jest.mock('uuid', () => {
  return {
    v4: jest.fn(() => 'mocked-uuid'),
  }
})

describe('JWTSession', () => {
  const HOST = 'ws://localhost:8080'
  const bladeConnect = BladeConnect({
    authentication: {
      project: 'asd',
      jwt_token: 'sometoken',
    },
    params: {},
  })

  let ws: WS
  beforeEach(() => {
    ws = new WS(HOST)
  })
  afterEach(() => {
    WS.clean()
  })

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

  it('should send blade.connect with jwt_token on socket open', async () => {
    const client = new JWTSession({
      host: HOST,
      project: 'asd',
      token: 'sometoken',
    })

    client.connect()
    await ws.connected

    await expect(ws).toReceiveMessage(JSON.stringify(bladeConnect))
  })
})
