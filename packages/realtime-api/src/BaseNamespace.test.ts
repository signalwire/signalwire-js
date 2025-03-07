import { BaseNamespace } from './BaseNamespace'

describe('BaseNamespace', () => {
  // Using 'any' data type to bypass TypeScript checks for private or protected members.
  let baseNamespace: any
  let swClientMock: any
  let listenersMap: Record<string, () => void> = {}

  const listenOptions = {
    topics: ['topic1', 'topic2'],
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
        session: {
          on: jest
            .fn()
            .mockImplementation((event: string, callback: () => void) => {
              listenersMap[event] = callback
            }),
          once: jest
            .fn()
            .mockImplementation((event: string, callback: () => void) => {
              listenersMap[event] = callback
            }),
          off: jest.fn(),
        },
      },
    }
    baseNamespace = new BaseNamespace(swClientMock)
    baseNamespace._eventMap = eventMap
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('addTopics', () => {
    it('should call execute to add topics with the correct parameters', async () => {
      const executeMock = jest.spyOn(swClientMock.client, 'execute')

      await baseNamespace.addTopics(listenOptions.topics)

      expect(executeMock).toHaveBeenCalledWith({
        method: 'signalwire.receive',
        params: {
          contexts: listenOptions.topics,
        },
      })
    })
  })

  describe('removeTopics', () => {
    it('should call execute to remove topics with the correct parameters', async () => {
      const executeMock = jest.spyOn(swClientMock.client, 'execute')

      await baseNamespace.removeTopics(listenOptions.topics)

      expect(executeMock).toHaveBeenCalledWith({
        method: 'signalwire.unreceive',
        params: {
          contexts: listenOptions.topics,
        },
      })
    })
  })

  describe('listen', () => {
    it('should throw an error if topics is not an array with at least one topic', async () => {
      const thrownMessage =
        'Invalid options: topics should be an array with at least one topic!'

      await expect(baseNamespace.listen({ topics: [] })).rejects.toThrow(
        thrownMessage
      )
      await expect(baseNamespace.listen({ topics: 'topic' })).rejects.toThrow(
        thrownMessage
      )
    })

    it('should call the subscribe method with listen options', async () => {
      const subscribeMock = jest.spyOn(baseNamespace, 'subscribe')

      await baseNamespace.listen(listenOptions)

      expect(subscribeMock).toHaveBeenCalledWith(listenOptions)
    })

    it('should resolve with a function to unsubscribe', async () => {
      const unsubscribeMock = jest.fn().mockResolvedValue(undefined)
      jest.spyOn(baseNamespace, 'subscribe').mockResolvedValue(unsubscribeMock)

      const unsub = await baseNamespace.listen(listenOptions)
      expect(typeof unsub).toBe('function')

      await unsub()
      expect(unsubscribeMock).toHaveBeenCalled()
    })
  })

  describe('subscribe', () => {
    it('should attach listeners, add topics, and return an unsubscribe function', async () => {
      // Mock this._eventMap
      baseNamespace._eventMap = eventMap

      // Mock emitter.on method
      const emitterOnMock: jest.Mock = jest.fn()
      baseNamespace.emitter.on = emitterOnMock

      // Mock emitter.off method
      const emitterOffMock: jest.Mock = jest.fn()
      baseNamespace.emitter.off = emitterOffMock

      // Mock addTopics method
      const addTopicsMock: jest.Mock = jest.fn()
      baseNamespace.addTopics = addTopicsMock

      // Mock removeTopics method
      const removeTopicsMock: jest.Mock = jest.fn()
      baseNamespace.removeTopics = removeTopicsMock

      const { topics, ...listeners } = listenOptions
      const unsub = await baseNamespace.subscribe(listenOptions)

      // Check if the listeners are attached
      const listenerKeys = Object.keys(listeners) as Array<
        keyof typeof listeners
      >
      topics.forEach((topic) => {
        listenerKeys.forEach((key) => {
          const expectedEventName = `${topic}.${eventMap[key]}`
          expect(emitterOnMock).toHaveBeenCalledWith(
            expectedEventName,
            listeners[key]
          )
        })
      })
      // Check if topics are added
      expect(baseNamespace.addTopics).toHaveBeenCalledWith(topics)
      // Check if the listener is added to the listener map
      expect(baseNamespace._listenerMap.size).toBe(1)
      const [[_, value]] = baseNamespace._listenerMap.entries()
      expect(value.topics).toEqual(new Set(topics))
      expect(value.listeners).toEqual(listeners)
      // Check if the returned unsubscribe function is valid
      expect(unsub).toBeInstanceOf(Function)
      await expect(unsub()).resolves.toBeUndefined()
      // Check if the topics are removed, listeners are detached, and entry is removed from the listener map
      expect(baseNamespace.removeTopics).toHaveBeenCalledWith(topics)
      topics.forEach((topic) => {
        listenerKeys.forEach((key) => {
          const expectedEventName = `${topic}.${eventMap[key]}`
          expect(emitterOffMock).toHaveBeenCalledWith(
            expectedEventName,
            listeners[key]
          )
        })
      })
      expect(baseNamespace._listenerMap.size).toBe(0)
    })

    it('should resubscribe topics after a session reconnection', async () => {
      const addTopicsMock = jest
        .spyOn(baseNamespace, 'addTopics')
        .mockResolvedValue(null)

      await expect(
        baseNamespace.subscribe(listenOptions)
      ).resolves.toBeInstanceOf(Function)

      expect(addTopicsMock).toHaveBeenCalledTimes(1)

      expect(listenersMap['session.reconnecting']).toBeDefined()
      // simulate ws closed
      listenersMap['session.reconnecting']()

      expect(listenersMap['session.connected']).toBeDefined()
      // simulate ws opened
      listenersMap['session.connected']()

      expect(addTopicsMock).toHaveBeenCalledTimes(2)
    })

    it('should resubscribe only active topics after a session reconnection', async () => {
      const addTopicsMock = jest
        .spyOn(baseNamespace, 'addTopics')
        .mockResolvedValue(null)

      const mockTopics1 = ['topic1']
      const unsub = await baseNamespace.subscribe({
        ...listenOptions,
        topics: mockTopics1,
      })

      expect(addTopicsMock).toHaveBeenCalledTimes(1)
      expect(addTopicsMock).toHaveBeenCalledWith(mockTopics1)

      const mockTopics2 = ['topic2', 'topic3']
      await baseNamespace.subscribe({
        ...listenOptions,
        topics: mockTopics2,
      })

      expect(addTopicsMock).toHaveBeenCalledTimes(2)
      expect(addTopicsMock).toHaveBeenCalledWith(mockTopics2)

      const mockTopics3 = ['topic4', 'topic5']
      await baseNamespace.subscribe({
        ...listenOptions,
        topics: mockTopics3,
      })

      expect(addTopicsMock).toHaveBeenCalledTimes(3)
      expect(addTopicsMock).toHaveBeenCalledWith(mockTopics3)

      // Unsubscribe first subscription
      await unsub()

      expect(listenersMap['session.reconnecting']).toBeDefined()
      // simulate ws closed
      listenersMap['session.reconnecting']()

      expect(listenersMap['session.connected']).toBeDefined()
      // simulate ws opened
      listenersMap['session.connected']()

      expect(addTopicsMock).toHaveBeenCalledTimes(4)
      expect(addTopicsMock).toHaveBeenCalledWith([
        ...mockTopics2,
        ...mockTopics3,
      ])
    })
  })

  describe('hasOtherListeners', () => {
    it('should return true if other listeners exist for the given topic', () => {
      const uuid = 'uuid1'
      const otherUUID = 'uuid2'

      baseNamespace._listenerMap.set(uuid, {
        topics: new Set(['topic1', 'topic2']),
        listeners: {},
        unsub: jest.fn(),
      })
      baseNamespace._listenerMap.set(otherUUID, {
        topics: new Set(['topic2']),
        listeners: {},
        unsub: jest.fn(),
      })

      const result = baseNamespace.hasOtherListeners(uuid, 'topic2')

      expect(result).toBe(true)
    })

    it('should return false if no other listeners exist for the given topic', () => {
      const uuid = 'uuid1'
      const otherUUID = 'uuid2'

      baseNamespace._listenerMap.set(uuid, {
        topics: new Set(['topic1', 'topic2']),
        listeners: {},
        unsub: jest.fn(),
      })
      baseNamespace._listenerMap.set(otherUUID, {
        topics: new Set(['topic2']),
        listeners: {},
        unsub: jest.fn(),
      })

      const result = baseNamespace.hasOtherListeners(uuid, 'topic1')

      expect(result).toBe(false)
    })
  })

  describe('unsubscribeAll', () => {
    it('should call unsubscribe for each listener and clear the listener map', async () => {
      const listener1 = { unsub: jest.fn() }
      const listener2 = { unsub: jest.fn() }
      baseNamespace._listenerMap.set('uuid1', listener1)
      baseNamespace._listenerMap.set('uuid2', listener2)

      expect(baseNamespace._listenerMap.size).toBe(2)

      await baseNamespace.unsubscribeAll()

      expect(listener1.unsub).toHaveBeenCalledTimes(1)
      expect(listener2.unsub).toHaveBeenCalledTimes(1)
      expect(baseNamespace._listenerMap.size).toBe(0)
    })
  })
})
