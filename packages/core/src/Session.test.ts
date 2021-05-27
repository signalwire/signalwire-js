import WS from 'jest-websocket-mock'

import { Session } from './Session'
import { BladeConnect, BladePing, BladePingResponse } from './RPCMessages'

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
  let session: Session
  beforeEach(() => {
    ws = new WS(host)
    session = new Session({
      host,
      project,
      token,
    })
    session.WebSocketConstructor = WebSocket
    session.dispatch = jest.fn()
  })
  afterEach(() => {
    WS.clean()
  })

  it('should connect and disconnect to/from the provided host', async () => {
    session.connect()
    await ws.connected

    expect(session.connected).toBe(true)

    session.disconnect()

    expect(session.connected).toBe(false)
    expect(session.closed).toBe(true)
  })

  it('should send blade.connect with normal token on socket open', async () => {
    session.connect()
    await ws.connected

    await expect(ws).toReceiveMessage(JSON.stringify(bladeConnect))
  })

  describe('blade.ping messages', () => {
    it('should response to blade.ping', async () => {
      session.connect()
      await ws.connected

      await expect(ws).toReceiveMessage(JSON.stringify(bladeConnect))

      const ping = BladePing()
      ping.id = 'ping-uuid'
      ws.send(JSON.stringify(ping))

      const response = BladePingResponse(ping.id, ping.params.timestamp)
      await expect(ws).toReceiveMessage(JSON.stringify(response))
    })

    it('should close the connection if no blade.ping comes within _checkPingDelay', async (done) => {
      // Force _checkPingDelay to 5ms
      session['_checkPingDelay'] = 5

      session.connect()
      await ws.connected

      const ping = BladePing()
      ping.id = 'ping-uuid'
      ws.send(JSON.stringify(ping))

      // Expect the session to be closed after 10ms
      setTimeout(() => {
        expect(session.connected).toBe(false)
        expect(session.closed).toBe(true)
        done()
      }, 10)
    })
  })
})
