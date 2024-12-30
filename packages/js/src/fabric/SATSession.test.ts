import WS from 'jest-websocket-mock'
import { SATSession } from './SATSession'
import { SWCloseEvent, UNIFIED_CONNECT_VERSION } from '@signalwire/core'

jest.mock('uuid', () => {
  return {
    v4: jest.fn(() => 'mocked-uuid'),
  }
})

describe('SATSession', () => {
  const host = 'ws://localhost:8080'
  const project = '2506edbc-35c4-4d9f-a5f0-45a03d82dab1'
  const token = 'PT1234abc'

  let ws: WS
  let session: SATSession
  beforeEach(() => {
    ws = new WS(host)
    // Respond to RPCs
    ws.on('connection', (socket: any) => {
      socket.on('message', (data: any) => {
        const parsedData = JSON.parse(data)
        if (parsedData.params) {
          socket.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: parsedData.id,
              result: {},
            })
          )
        }
      })
    })

    session = new SATSession({
      host,
      project,
      token,
    })
    session.WebSocketConstructor = WebSocket
    session.CloseEventConstructor = SWCloseEvent
    session.dispatch = jest.fn()
  })
  afterEach(() => {
    WS.clean()
  })

  it('should subscribe with the latest version', async () => {
    session.connect()
    await ws.connected

    expect(session.connected).toBe(true)

    await expect(ws).toReceiveMessage(
      expect.stringContaining(JSON.stringify(UNIFIED_CONNECT_VERSION))
    )

    session.disconnect()

    expect(session.connected).toBe(false)
    expect(session.closed).toBe(true)
  })
})
