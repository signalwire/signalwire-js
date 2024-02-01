import { EventEmitter } from '@signalwire/core'
import { Voice } from './Voice'
import { createClient } from '../client/createClient'

describe('Voice', () => {
  let voice: Voice
  const userOptions = {
    host: 'example.com',
    project: 'example.project',
    token: 'example.token',
  }
  const swClientMock = {
    userOptions,
    client: createClient(userOptions),
  }

  beforeEach(() => {
    // @ts-expect-error
    voice = new Voice(swClientMock)
    // @ts-expect-error
    voice._client.execute = jest.fn()
    // @ts-expect-error
    voice._client.runWorker = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should have an event emitter', () => {
    expect(voice['emitter']).toBeInstanceOf(EventEmitter)
  })

  it('should declare the correct event map', () => {
    const expectedEventMap = {
      onCallReceived: 'call.received',
    }
    expect(voice['_eventMap']).toEqual(expectedEventMap)
  })

  it('should dial a phone number', async () => {
    // @ts-expect-error
    voice._client.execute.mockResolvedValueOnce()
    // @ts-expect-error
    voice._client.runWorker.mockResolvedValueOnce()

    voice.dialPhone({
      to: '+1234567890',
      from: '+1234567890',
    })

    // @ts-expect-error
    expect(voice.emitter.eventNames()).toStrictEqual([
      'dial.answered',
      'dial.failed',
    ])

    // @ts-expect-error
    expect(voice._client.runWorker).toHaveBeenCalled()
    // @ts-expect-error
    expect(voice._client.execute).toHaveBeenCalled()
  })
})
