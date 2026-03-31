import WS from 'jest-websocket-mock'
import { BaseSession } from './BaseSession'
import {
  socketMessageAction,
  sessionReconnectingAction,
  authErrorAction,
} from './redux/actions'
import {
  RPCConnect,
  RPCPing,
  RPCPingResponse,
  RPCDisconnectResponse,
} from './RPCMessages'
import { SWCloseEvent } from './utils'
import { JSONRPCErrorCode } from './utils/constants'
import { wait } from './testUtils'

jest.mock('uuid', () => {
  return {
    v4: jest.fn(() => 'mocked-uuid'),
  }
})

describe('BaseSession', () => {
  const host = 'ws://localhost:8080'
  const project = '2506edbc-35c4-4d9f-a5f0-45a03d82dab1'
  const token = 'PT1234abc'
  const rpcConnect = RPCConnect({
    authentication: {
      project,
      token,
    },
  })

  let ws: WS
  let session: BaseSession

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

    session = new BaseSession({
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

  it('should include events_ack on RPCConnect message', () => {
    expect(rpcConnect.params.event_acks).toBeTruthy()
  })

  it('should connect and disconnect to/from the provided host', async () => {
    session.connect()
    await ws.connected

    expect(session.connected).toBe(true)

    await expect(ws).toReceiveMessage(JSON.stringify(rpcConnect))

    session.disconnect()

    expect(session.connected).toBe(false)
    expect(session.closed).toBe(true)
  })

  it('should try to connect with normal token on socket open', async () => {
    session.connect()
    await ws.connected

    await expect(ws).toReceiveMessage(JSON.stringify(rpcConnect))

    session.disconnect()
  })

  it('should set idle mode on signalwire.disconnect', async () => {
    session.connect()
    await ws.connected

    await expect(ws).toReceiveMessage(JSON.stringify(rpcConnect))
    const request = {
      jsonrpc: '2.0',
      id: 'uuid',
      method: 'signalwire.disconnect',
      params: {},
    }
    ws.send(JSON.stringify(request))

    expect(session.status).toEqual('unknown')
    const response = RPCDisconnectResponse(request.id)
    await expect(ws).toReceiveMessage(JSON.stringify(response))
    expect(session.status).toEqual('idle')

    session.disconnect()
  })

  it('should dispatch reconnecting action on socket close and then call connect again', async () => {
    const connectSpy = jest.spyOn(session, 'connect')

    session.connect()
    await ws.connected

    expect(session.connected).toBe(true)
    await expect(ws).toReceiveMessage(JSON.stringify(rpcConnect))

    // Force reconnectDelay() to always return 1000ms
    const mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0)

    // Switch to fake timers for the reconnect delay
    jest.useFakeTimers()

    // Simulate the socket close event
    ws.close({
      code: 1001,
      reason: 'Network Failure',
      wasClean: false,
    })

    expect(session.dispatch).toHaveBeenCalledWith(sessionReconnectingAction())
    expect(session.connected).toBe(false)

    // Advance timers by exactly the fixed delay (1000ms)
    jest.advanceTimersByTime(1000)

    // The SDK should try to call connect again
    expect(connectSpy).toHaveBeenCalledTimes(2)

    // Clean up - restore real timers and the Math.random mock
    jest.useRealTimers()
    mathRandomSpy.mockRestore()
  })

  describe('signalwire.event messages', () => {
    it('should invoke dispatch with socketMessage action for any other message', async () => {
      session.connect()
      await ws.connected

      await expect(ws).toReceiveMessage(JSON.stringify(rpcConnect))
      const request = {
        jsonrpc: '2.0' as const,
        id: 'uuid',
        method: 'signalwire.event' as const,
        params: {
          key: 'value',
        },
      }
      ws.send(JSON.stringify(request))

      expect(session.dispatch).toHaveBeenCalledTimes(1)
      expect(session.dispatch).toHaveBeenCalledWith(
        socketMessageAction(request)
      )

      session.disconnect()
    })

    it('should send acknowledge message on signalwire.event', async () => {
      session.connect()
      await ws.connected

      await expect(ws).toReceiveMessage(JSON.stringify(rpcConnect))
      const request = {
        jsonrpc: '2.0' as const,
        id: 'uuid',
        method: 'signalwire.event' as const,
        params: {
          key: 'value',
        },
      }
      ws.send(JSON.stringify(request))

      await expect(ws).toReceiveMessage(
        JSON.stringify({
          jsonrpc: '2.0' as const,
          id: 'uuid',
          result: {},
        })
      )

      session.disconnect()
    })
  })

  describe('signalwire.connect error handling', () => {
    function createErrorServer(code: number, message: string) {
      WS.clean()
      const errorWs = new WS(host)
      errorWs.on('connection', (socket: any) => {
        socket.on('message', (data: any) => {
          const parsedData = JSON.parse(data)
          if (parsedData.method === 'signalwire.connect') {
            socket.send(
              JSON.stringify({
                jsonrpc: '2.0',
                id: parsedData.id,
                error: { code, message },
              })
            )
          }
        })
      })
      return errorWs
    }

    it('should emit auth error for -32002 (AUTHENTICATION_FAILED)', async () => {
      const errorWs = createErrorServer(
        JSONRPCErrorCode.AUTHENTICATION_FAILED,
        'Authentication service failed with status ProtocolError, 401 Unauthorized: {}'
      )

      session.connect()
      await errorWs.connected
      await wait(10)

      expect(session.dispatch).toHaveBeenCalledWith(
        authErrorAction({
          error: {
            code: JSONRPCErrorCode.AUTHENTICATION_FAILED,
            message:
              'Authentication service failed with status ProtocolError, 401 Unauthorized: {}',
          },
        })
      )
    })

    it('should reconnect for -32603 (INTERNAL_ERROR) instead of emitting auth error', async () => {
      const errorWs = createErrorServer(
        JSONRPCErrorCode.INTERNAL_ERROR,
        'Internal error'
      )

      session.connect()
      await errorWs.connected
      await wait(10)

      const dispatches = (session.dispatch as jest.Mock).mock.calls
      const authErrors = dispatches.filter(
        ([action]: any) =>
          action.type === authErrorAction({ error: {} as any }).type
      )
      expect(authErrors).toHaveLength(0)
      expect(session.status).toBe('reconnecting')
    })

    it('should reconnect for unknown error codes instead of emitting auth error', async () => {
      const errorWs = createErrorServer(-32000, 'Timeout')

      session.connect()
      await errorWs.connected
      await wait(10)

      const dispatches = (session.dispatch as jest.Mock).mock.calls
      const authErrors = dispatches.filter(
        ([action]: any) =>
          action.type === authErrorAction({ error: {} as any }).type
      )
      expect(authErrors).toHaveLength(0)
      expect(session.status).toBe('reconnecting')
    })
  })

  describe('signalwire.ping messages', () => {
    it('should response to signalwire.ping', async () => {
      session.connect()
      await ws.connected

      await expect(ws).toReceiveMessage(JSON.stringify(rpcConnect))

      const ping = RPCPing()
      ping.id = 'ping-uuid'
      ws.send(JSON.stringify(ping))

      const response = RPCPingResponse(ping.id, ping.params.timestamp)
      await expect(ws).toReceiveMessage(JSON.stringify(response))

      session.disconnect()
    })

    it('should close the connection if no signalwire.ping comes within _checkPingDelay', async () => {
      // Force _checkPingDelay to 5ms
      session['_checkPingDelay'] = 5

      session.connect()
      await ws.connected

      const ping = RPCPing()
      ping.id = 'ping-uuid'
      ws.send(JSON.stringify(ping))

      // Expect the session to be closed after 10ms
      await wait(10)
      expect(session.connected).toBe(false)
      expect(session.closed).toBe(true)

      session.disconnect()
    })
  })
})
