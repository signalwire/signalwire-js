import WS from 'jest-websocket-mock'
import { Client } from './VideoClient'
import * as Video from './Video'

describe('VideoClient', () => {
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
      it('should automatically connect the underlying client', (done) => {
        const video = new Client({
          // @ts-expect-error
          host,
          project: 'some-project',
          token,
        })

        video.once('room.started', () => {})

        video._session.on('session.connected', () => {
          video._session.disconnect()

          done()
        })
      })
    })

    describe('Automatic subscribe', () => {
      let createVideoObjectMock: jest.SpyInstance
      const mockedVideo: any = {
        subscribe: jest.fn(() => Promise.resolve()),
        on: jest.fn(),
      }
      beforeEach(async () => {
        createVideoObjectMock = jest
          .spyOn(Video, 'createVideoObject')
          .mockImplementationOnce(() => {
            return mockedVideo
          })
      })
      afterEach(() => {
        createVideoObjectMock.mockRestore()
        Object.values(mockedVideo).forEach((mock: any) => {
          if (typeof mock.mockRestore === 'function') {
            mock.mockRestore()
          }
        })
      })

      it('should automatically call subscribe the moment the client is connected', async () => {
        const video = new Client({
          // @ts-expect-error
          host,
          project: 'some-project-x',
          token,
        })

        video.on('room.started', () => {})

        // Artificial timer to wait for the connect() to happen
        await new Promise((r) => setTimeout(r, 1000))

        expect(mockedVideo.subscribe).toHaveBeenCalledTimes(1)

        video._session.disconnect()
      })
    })

    describe('Subscribe error', () => {
      let createVideoObjectMock: jest.SpyInstance
      const mockedVideo: any = {
        subscribe: jest.fn(() => Promise.reject()),
        on: jest.fn(),
      }
      beforeEach(async () => {
        createVideoObjectMock = jest
          .spyOn(Video, 'createVideoObject')
          .mockImplementationOnce(() => {
            return mockedVideo
          })
      })
      afterEach(() => {
        createVideoObjectMock.mockRestore()
        Object.values(mockedVideo).forEach((mock: any) => {
          if (typeof mock.mockRestore === 'function') {
            mock.mockRestore()
          }
        })
      })

      it('should show an error message if the call to subscribe fails', async () => {
        const logger = {
          error: jest.fn(),
          trace: jest.fn(),
          debug: jest.fn(),
          warn: jest.fn(),
        }
        const video = new Client({
          // @ts-expect-error
          host,
          project: 'some-project-t',
          token,
          logger: logger as any,
        })

        try {
          // It's not neccessary to call `subcribe()`
          // manually. We're doing it here to avoid creating
          // a timer for the `connect()`
          await video.subscribe()
        } catch (e) {
          expect(logger.error).toHaveBeenCalledWith(
            'Client subscription failed.'
          )
        }

        video._session.disconnect()
      })
    })

    it('should show an error if client.connect failed to connect', async () => {
      const logger = {
        error: jest.fn(),
        trace: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
      }
      const video = new Client({
        // @ts-expect-error
        host,
        project: 'some-project',
        token: '<invalid-token>',
        logger: logger as any,
      })

      await video.subscribe()

      expect(logger.error).toHaveBeenNthCalledWith(1, 'Auth Error', {
        code: -32002,
        message:
          'Authentication service failed with status ProtocolError, 401 Unauthorized: {}',
      })

      video._session.disconnect()
    })
  })
})
