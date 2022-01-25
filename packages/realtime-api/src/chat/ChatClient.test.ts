import WS from 'jest-websocket-mock'
import * as getProxiedClient from '../client/getProxiedClient'
import { Client } from './ChatClient'

describe('ChatClient', () => {
  describe('Client', () => {
    const host = 'ws://localhost:1234'
    const token = '<jwt>'
    let server: WS
    const authError = {
      code: -32002,
      message:
        'Authentication service failed with status ProtocolError, 401 Unauthorized: {}',
    }

    beforeEach(async () => {
      server = new WS(host)
      server.on('connection', (socket: any) => {
        socket.on('message', (data: any) => {
          const parsedData = JSON.parse(data)

          if (
            parsedData.method === 'signalwire.connect' &&
            parsedData.params.authentication.token === '<invalid-token>'
          ) {
            socket.send(
              JSON.stringify({
                jsonrpc: '2.0',
                id: parsedData.id,
                error: authError,
              })
            )
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
      WS.clean()
    })

    describe('Automatic connect', () => {
      let getClientMock: jest.SpyInstance
      const mockedBaseClient: any = {
        connect: jest.fn(() => Promise.resolve()),
        on: jest.fn(),
      }

      beforeEach(async () => {
        getClientMock = jest
          .spyOn(getProxiedClient, 'getProxiedClient')
          .mockImplementationOnce(() => {
            return mockedBaseClient
          })
      })

      afterEach(() => {
        getClientMock.mockRestore()
        Object.values(mockedBaseClient).forEach((mock: any) => {
          if (typeof mock.mockRestore === 'function') {
            mock.mockRestore()
          }
        })
      })
      it('should automatically connect the underlying client', async () => {
        const chat = new Client({
          // @ts-expect-error
          host,
          project: 'some-project',
          token,
        })

        expect(mockedBaseClient.connect).toHaveBeenCalledTimes(0)

        chat.once('member.joined', () => {})

        expect(mockedBaseClient.connect).toHaveBeenCalledTimes(1)
      })
    })

    it('should show an error if client.connect failed to connect', async () => {
      const logger = {
        error: jest.fn(),
        trace: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
      }
      const chat = new Client({
        // @ts-expect-error
        host,
        project: 'some-project',
        token: '<invalid-token>',
        logger: logger as any,
      })

      await chat.subscribe('some-channel')

      expect(logger.error).toHaveBeenNthCalledWith(1, 'Auth Error', {
        code: -32002,
        message:
          'Authentication service failed with status ProtocolError, 401 Unauthorized: {}',
      })
    })
  })
})
