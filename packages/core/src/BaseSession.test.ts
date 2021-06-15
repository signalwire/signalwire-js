import WS from 'jest-websocket-mock'

import { BaseSession } from './BaseSession'
import { socketMessage } from './redux/actions'
import {
  BladeConnect,
  BladePing,
  BladePingResponse,
  BladeDisconnectResponse,
} from './RPCMessages'

jest.mock('uuid', () => {
  return {
    v4: jest.fn(() => 'mocked-uuid'),
  }
})

describe('BaseSession', () => {
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
  let session: BaseSession
  beforeEach(() => {
    ws = new WS(host)
    session = new BaseSession({
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

  it('should set idle mode on blade.disconnect', async () => {
    session.connect()
    await ws.connected

    await expect(ws).toReceiveMessage(JSON.stringify(bladeConnect))
    const request = {
      jsonrpc: '2.0',
      id: 'uuid',
      method: 'blade.disconnect',
      params: {},
    }
    ws.send(JSON.stringify(request))

    expect(session['_idle']).toBe(false)
    const response = BladeDisconnectResponse(request.id)
    await expect(ws).toReceiveMessage(JSON.stringify(response))
    expect(session['_idle']).toBe(true)
  })

  it('should invoke dispatch with socketMessage action for any other message', async () => {
    session.connect()
    await ws.connected

    await expect(ws).toReceiveMessage(JSON.stringify(bladeConnect))
    const request = {
      jsonrpc: '2.0' as const,
      id: 'uuid',
      method: 'blade.something',
      params: {
        key: 'value',
      },
    }
    ws.send(JSON.stringify(request))

    expect(session.dispatch).toHaveBeenCalledTimes(1)
    expect(session.dispatch).toHaveBeenCalledWith(socketMessage(request))
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
