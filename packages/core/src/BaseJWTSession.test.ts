import WS from 'jest-websocket-mock'
import { BaseJWTSession } from './BaseJWTSession'
import { RPCConnect } from './RPCMessages'
import { SWCloseEvent } from './utils'

class JWTSession extends BaseJWTSession {
  public WebSocketConstructor = WebSocket
  public CloseEventConstructor = SWCloseEvent
}

jest.mock('uuid', () => {
  return {
    v4: jest.fn(() => 'mocked-uuid'),
  }
})

describe('JWTSession', () => {
  const host = 'ws://localhost:8080'
  const token = '<jwt>'
  const rpcConnect = RPCConnect({
    authentication: {
      jwt_token: token,
    },
  })

  let ws: WS
  let session: JWTSession
  beforeEach(() => {
    ws = new WS(host)
    // Respond to RPCs
    ws.on('connection', (socket: any) => {
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
    session = new JWTSession({
      host,
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

    await expect(ws).toReceiveMessage(JSON.stringify(rpcConnect))

    session.disconnect()

    expect(session.connected).toBe(false)
    expect(session.closed).toBe(true)
  })

  it('should try to connect with jwt_token on socket open', async () => {
    session.connect()
    await ws.connected

    await expect(ws).toReceiveMessage(JSON.stringify(rpcConnect))

    session.disconnect()
  })
})
