import { EventEmitter } from '@signalwire/core'
import { PubSub } from './PubSub'
import { createClient } from '../client/createClient'

describe('PubSub', () => {
  let pubSub: PubSub
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
    //@ts-expect-error
    pubSub = new PubSub(swClientMock)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should have an event emitter', () => {
    expect(pubSub['emitter']).toBeInstanceOf(EventEmitter)
  })

  it('should declare the correct event map', () => {
    const expectedEventMap = {
      onMessageReceived: 'chat.message',
    }
    expect(pubSub['_eventMap']).toEqual(expectedEventMap)
  })
})
