/**
 * @jest-environment jsdom
 */

import WS from 'jest-websocket-mock'
import { AuthError } from '@signalwire/core'
import { createClient } from './createClient'

describe('createClient', () => {
  const host = 'ws://localhost:1234'
  const token = '<jwt>'
  const authError = {
    code: -32002,
    message:
      'Authentication service failed with status ProtocolError, 401 Unauthorized: {}',
  }

  let server: WS
  let consoleMock: jest.SpyInstance
  beforeEach(async () => {
    consoleMock = jest
      .spyOn(global.console, 'error')
      .mockImplementation(() => {})

    server = new WS(host)
    server.on('connection', (socket) => {
      socket.on('message', (data: any) => {
        const parsedData = JSON.parse(data)

        if (
          parsedData.method === 'signalwire.connect' &&
          parsedData.params.authentication.jwt_token === '<invalid-token>'
        ) {
          socket.send(
            JSON.stringify({
              jsonrpc: '2.0',
              id: parsedData.id,
              error: authError,
            })
          )
          return
        }

        socket.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: parsedData.id,
            result: {},
          })
        )
      })
    })
  })

  afterEach(() => {
    consoleMock.mockRestore()
    WS.clean()
  })

  it('should throw an error when invalid credentials are provided', async () => {
    expect.assertions(1)

    const client = createClient({
      host,
      token: '<invalid-token>',
    })

    try {
      await client.connect()
    } catch (e) {
      expect(e).toBeInstanceOf(AuthError)
    }
    client.disconnect()
  })

  it('should resolve `connect()` when the client is authorized', async () => {
    expect.assertions(1)

    const client = createClient({
      host,
      token,
    })

    // @ts-expect-error
    client._waitUntilSessionAuthorized().then((c) => {
      expect(c).toEqual(client)
    })

    await client.connect()
    client.disconnect()
  })

  it('should automatically resolve (without hitting the network) when calling `.connect()` if the session was already authorized', async () => {
    const h = 'ws://localhost:2222'
    const s = new WS(h)

    let messageHandler
    s.on('connection', (socket) => {
      messageHandler = jest.fn((data: any) => {
        const parsedData = JSON.parse(data)

        socket.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: parsedData.id,
            result: {},
          })
        )
      })

      socket.on('message', messageHandler)
    })

    const client = createClient({
      host: h,
      token,
    })

    await Promise.all([client.connect(), client.connect(), client.connect()])

    expect(messageHandler).toHaveBeenCalledTimes(1)
    client.disconnect()
  })
})
