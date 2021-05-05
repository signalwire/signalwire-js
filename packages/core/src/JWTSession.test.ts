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
  const project = '2506edbc-35c4-4d9f-a5f0-45a03d82dab1'
  const token = '<jwt>'
  const bladeConnect = BladeConnect({
    authentication: {
      project,
      jwt_token: token,
    },
    params: {},
  })

  let ws: WS
  let session: JWTSession
  beforeEach(() => {
    ws = new WS(host)
    session = new JWTSession({
      host,
      project,
      token,
    })
    session.dispatch = jest.fn()
  })
  afterEach(() => {
    WS.clean()
  })

  it('should connect connect and disconnect to/from the provided host', async () => {
    session.connect()
    await ws.connected

    expect(session.connected).toBe(true)

    session.disconnect()

    expect(session.connected).toBe(false)
    expect(session.closed).toBe(true)
  })

  it('should send blade.connect with jwt_token on socket open', async () => {
    session.connect()
    await ws.connected

    await expect(ws).toReceiveMessage(JSON.stringify(bladeConnect))
  })
})
