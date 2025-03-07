import { EventEmitter } from '@signalwire/core'
import { Messaging } from './Messaging'
import { createClient } from '../client/createClient'

describe('Messaging', () => {
  let messaging: Messaging
  const userOptions = {
    host: 'example.com',
    project: 'example.project',
    token: 'example.token',
  }
  const swClientMock = {
    userOptions,
    client: {
      ...createClient(userOptions),
      execute: jest.fn(),
      runWorker: jest.fn(),
      logger: { error: jest.fn() },
      session: {
        on: jest.fn(),
        once: jest.fn(),
        off: jest.fn(),
      },
    },
  }

  beforeEach(() => {
    //@ts-expect-error
    messaging = new Messaging(swClientMock)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should have an event emitter', () => {
    expect(messaging['emitter']).toBeInstanceOf(EventEmitter)
  })

  it('should declare the correct event map', () => {
    const expectedEventMap = {
      onMessageReceived: 'message.received',
      onMessageUpdated: 'message.updated',
    }
    expect(messaging['_eventMap']).toEqual(expectedEventMap)
  })

  it('should send a message', async () => {
    const responseMock = {}
    swClientMock.client.execute.mockResolvedValue(responseMock)

    const sendParams = {
      from: '+1234',
      to: '+5678',
      body: 'Hello jest!',
    }

    const result = await messaging.send(sendParams)

    expect(result).toEqual(responseMock)
    expect(swClientMock.client.execute).toHaveBeenCalledWith({
      method: 'messaging.send',
      params: {
        body: 'Hello jest!',
        from_number: sendParams.from,
        to_number: sendParams.to,
      },
    })
  })

  it('should handle send error', async () => {
    const errorMock = new Error('Send error')
    swClientMock.client.execute.mockRejectedValue(errorMock)

    const sendParams = {
      from: '+1234',
      to: '+5678',
      body: 'Hello jest!',
    }

    await expect(messaging.send(sendParams)).rejects.toThrow(errorMock)
  })
})
