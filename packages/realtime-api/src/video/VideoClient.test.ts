import WS from 'jest-websocket-mock'
import * as getClient from '../client/getClient'
import { Client } from './VideoClient'

describe.only('VideoClient', () => {
  describe('Client', () => {
    const host = 'ws://localhost:1234'
    const token = '<jwt>'
    let server: WS
    let consoleMock: jest.SpyInstance
    let getClientMock: jest.SpyInstance
    const mockedBaseClient: any = {
      connect: jest.fn(),
      on: jest.fn(),
    }
    beforeEach(async () => {
      consoleMock = jest
        .spyOn(global.console, 'error')
        .mockImplementation(() => {})

      getClientMock = jest
        .spyOn(getClient, 'getClient')
        .mockImplementationOnce(() => {
          return mockedBaseClient
        })

      server = new WS(host)
      server.on('connection', (socket: any) => {
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
    })

    afterEach(() => {
      consoleMock.mockRestore()
      getClientMock.mockRestore()
      WS.clean()
    })

    it('should automatically connect the underlying client', async () => {
      const video = new Client({
        // @ts-expect-error
        host,
        token,
      })

      expect(mockedBaseClient.connect).toHaveBeenCalledTimes(0)

      video.once('room.started', () => {})

      expect(mockedBaseClient.connect).toHaveBeenCalledTimes(1)
    })
  })
})
