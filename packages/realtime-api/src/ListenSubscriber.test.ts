import { EventEmitter } from '@signalwire/core'
import { ListenSubscriber } from './ListenSubscriber'

describe('ListenSubscriber', () => {
  // Using 'any' data type to bypass TypeScript checks for private or protected members.
  let listentSubscriber: any
  let swClientMock: any
  const listeners = {
    onEvent1: jest.fn(),
    onEvent2: jest.fn(),
  }
  const eventMap: Record<string, string> = {
    onEvent1: 'event1',
    onEvent2: 'event2',
  }

  beforeEach(() => {
    swClientMock = {
      client: {
        execute: jest.fn(),
      },
    }
    listentSubscriber = new ListenSubscriber({ swClient: swClientMock })
    listentSubscriber._eventMap = eventMap
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('constructor', () => {
    it('should initialize the necessary properties', () => {
      expect(listentSubscriber._sw).toBe(swClientMock)
      expect(listentSubscriber._client).toBe(swClientMock.client)
      expect(listentSubscriber._eventMap).toBe(eventMap)
      expect(listentSubscriber._emitter).toBeInstanceOf(EventEmitter)
      expect(listentSubscriber._listenerMap).toBeInstanceOf(Map)
      expect(listentSubscriber._listenerMap.size).toBe(0)
    })
  })

  describe('listen', () => {
    it.each([undefined, {}, false, 'blah'])(
      'should throw an error on wrong listen params',
      async (param) => {
        await expect(listentSubscriber.listen(param)).rejects.toThrow(
          'Invalid params!'
        )
      }
    )

    it('should call the subscribe method with listen options', async () => {
      const subscribeMock = jest.spyOn(listentSubscriber, 'subscribe')

      await listentSubscriber.listen(listeners)

      expect(subscribeMock).toHaveBeenCalledWith(listeners)
    })

    it('should resolve with a function to unsubscribe', async () => {
      const unsubscribeMock = jest.fn().mockResolvedValue(undefined)
      jest
        .spyOn(listentSubscriber, 'subscribe')
        .mockResolvedValue(unsubscribeMock)

      const unsub = await listentSubscriber.listen(listeners)
      expect(typeof unsub).toBe('function')

      await unsub()
      expect(unsubscribeMock).toHaveBeenCalled()
    })
  })

  describe('subscribe', () => {
    let emitterOnMock: jest.Mock
    let emitterOffMock: jest.Mock

    beforeEach(() => {
      // Mock this._eventMap
      listentSubscriber._eventMap = eventMap

      // Mock emitter.on method
      emitterOnMock = jest.fn()
      listentSubscriber.emitter.on = emitterOnMock

      // Mock emitter.off method
      emitterOffMock = jest.fn()
      listentSubscriber.emitter.off = emitterOffMock
    })

    it('should attach listeners and return an unsubscribe function', async () => {
      const unsub = await listentSubscriber.subscribe(listeners)

      // Check if the listeners are attached
      const listenerKeys = Object.keys(listeners) as Array<
        keyof typeof listeners
      >
      listenerKeys.forEach((key) => {
        expect(emitterOnMock).toHaveBeenCalledWith(
          eventMap[key],
          listeners[key]
        )
      })

      // Check if the listener is added to the listener map
      expect(listentSubscriber._listenerMap.size).toBe(1)
      const [[_, value]] = listentSubscriber._listenerMap.entries()
      expect(value.listeners).toEqual(listeners)

      // Check if the returned unsubscribe function is valid
      expect(unsub).toBeInstanceOf(Function)
      await expect(unsub()).resolves.toBeUndefined()

      listenerKeys.forEach((key) => {
        expect(emitterOffMock).toHaveBeenCalledWith(
          eventMap[key],
          listeners[key]
        )
      })
      expect(listentSubscriber._listenerMap.size).toBe(0)
    })
  })

  describe('removeFromListenerMap', () => {
    it('should remove the listener with the given UUID from the listener map', () => {
      const idToRemove = 'uuid1'
      listentSubscriber._listenerMap.set('uuid1', {})
      listentSubscriber._listenerMap.set('uuid2', {})

      listentSubscriber.removeFromListenerMap(idToRemove)

      expect(listentSubscriber._listenerMap.size).toBe(1)
      expect(listentSubscriber._listenerMap.has(idToRemove)).toBe(false)
    })
  })
})
