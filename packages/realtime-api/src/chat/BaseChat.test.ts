import { BaseChat } from './BaseChat'

describe('BaseChat', () => {
  // Using 'any' data type to bypass TypeScript checks for private or protected members.
  let swClientMock: any
  let baseChat: any
  let listenersMap: Record<string, () => void> = {}

  const listenOptions = {
    channels: ['channel1', 'channel2'],
    onEvent1: jest.fn(),
    onEvent2: jest.fn(),
  }
  const eventMap: Record<string, string> = {
    onEvent1: 'event1',
    onEvent2: 'event2',
    onEvent3: 'event3',
    onEvent4: 'event4',
    onEvent5: 'event5',
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
    baseChat = new BaseChat(swClientMock)

    // Mock this._eventMap
    baseChat._eventMap = eventMap
  })

  describe('listen', () => {
    it('should throw an error if channels is not an array with at least one topic', async () => {
      const thrownMessage =
        'Invalid options: channels should be an array with at least one channel!'

      await expect(baseChat.listen({ channels: [] })).rejects.toThrow(
        thrownMessage
      )
      await expect(baseChat.listen({ channels: 'topic' })).rejects.toThrow(
        thrownMessage
      )
    })

    it('should call the subscribe method with listen options', async () => {
      const subscribeMock = jest.spyOn(baseChat, 'subscribe')

      await baseChat.listen(listenOptions)
      expect(subscribeMock).toHaveBeenCalledWith(listenOptions)
    })

    it('should resolve with a function to unsubscribe', async () => {
      const unsubscribeMock = jest.fn().mockResolvedValue(undefined)
      jest.spyOn(baseChat, 'subscribe').mockResolvedValue(unsubscribeMock)

      const unsub = await baseChat.listen(listenOptions)
      expect(typeof unsub).toBe('function')

      await unsub()
      expect(unsubscribeMock).toHaveBeenCalled()
    })
  })

  describe('subscribe', () => {
    const { channels, ...listeners } = listenOptions

    it('should add channels and attach listeners', async () => {
      const addChannelsMock = jest
        .spyOn(baseChat, 'addChannels')
        .mockResolvedValueOnce(null)
      const attachListenersMock = jest.spyOn(
        baseChat,
        '_attachListenersWithTopics'
      )

      await expect(baseChat.subscribe(listenOptions)).resolves.toBeInstanceOf(
        Function
      )
      expect(addChannelsMock).toHaveBeenCalledWith(channels, [
        'event1',
        'event2',
      ])
      expect(attachListenersMock).toHaveBeenCalledWith(channels, listeners)
    })

    it('should remove channels and detach listeners when unsubscribed', async () => {
      const removeChannelsMock = jest
        .spyOn(baseChat, 'removeChannels')
        .mockResolvedValueOnce(null)
      const detachListenersMock = jest.spyOn(
        baseChat,
        '_detachListenersWithTopics'
      )

      const unsub = await baseChat.subscribe({ channels, ...listeners })
      expect(unsub).toBeInstanceOf(Function)

      await expect(unsub()).resolves.toBeUndefined()
      expect(removeChannelsMock).toHaveBeenCalledWith(channels)
      expect(detachListenersMock).toHaveBeenCalledWith(channels, listeners)
    })

    it('should resubscribe after a session reconnection', async () => {
      const addChannelsMock = jest
        .spyOn(baseChat, 'addChannels')
        .mockResolvedValueOnce(null)

      await expect(baseChat.subscribe(listenOptions)).resolves.toBeInstanceOf(
        Function
      )

      expect(addChannelsMock).toHaveBeenCalledTimes(1)

      expect(listenersMap['session.reconnecting']).toBeDefined()
      // simulate ws closed
      listenersMap['session.reconnecting']()

      expect(listenersMap['session.connected']).toBeDefined()
      // simulate ws opened
      listenersMap['session.connected']()

      expect(addChannelsMock).toHaveBeenCalledTimes(2)
    })

    it('should resubscribe only active channels after a session reconnection', async () => {
      const addChannelsMock = jest
        .spyOn(baseChat, 'addChannels')
        .mockResolvedValue(null)

      const events1 = ['event1', 'event2']
      const listenOptions1 = {
        channels: ['channel1'],
        onEvent1: jest.fn(),
        onEvent2: jest.fn(),
      }
      await baseChat.subscribe(listenOptions1)

      expect(addChannelsMock).toHaveBeenCalledTimes(1)
      expect(addChannelsMock).toHaveBeenCalledWith(
        listenOptions1.channels,
        events1
      )

      const events2 = ['event2', 'event3']
      const listenOptions2 = {
        channels: ['channel2', 'channel3'],
        onEvent2: jest.fn(),
        onEvent3: jest.fn(),
      }
      const unsub = await baseChat.subscribe(listenOptions2)

      expect(addChannelsMock).toHaveBeenCalledTimes(2)
      expect(addChannelsMock).toHaveBeenCalledWith(
        listenOptions2.channels,
        events2
      )

      const events3 = ['event4', 'event5']
      const listenOptions3 = {
        channels: ['channel4', 'channel5'],
        onEvent4: jest.fn(),
        onEvent5: jest.fn(),
      }
      await baseChat.subscribe(listenOptions3)

      expect(addChannelsMock).toHaveBeenCalledTimes(3)
      expect(addChannelsMock).toHaveBeenCalledWith(
        listenOptions3.channels,
        events3
      )

      // Unsubscribe second subscription
      await unsub()

      expect(listenersMap['session.reconnecting']).toBeDefined()
      // simulate ws closed
      listenersMap['session.reconnecting']()

      expect(listenersMap['session.connected']).toBeDefined()
      // simulate ws opened
      listenersMap['session.connected']()

      expect(addChannelsMock).toHaveBeenCalledTimes(4)
      expect(addChannelsMock).toHaveBeenCalledWith(
        [...listenOptions1.channels, ...listenOptions3.channels],
        [...events1, ...events3]
      )
    })

    it('should resubscribe only to one channel after a session reconnection', async () => {
      const addChannelsMock = jest
        .spyOn(baseChat, 'addChannels')
        .mockResolvedValueOnce(null)

      const unsub = await baseChat.subscribe(listenOptions)

      await expect(
        baseChat.subscribe({ ...listenOptions, channels: ['channel-2'] })
      ).resolves.toBeInstanceOf(Function)

      await unsub()
      addChannelsMock.mockClear()

      expect(listenersMap['session.reconnecting']).toBeDefined()
      // simulate ws closed
      listenersMap['session.reconnecting']()

      expect(listenersMap['session.connected']).toBeDefined()
      // simulate ws opened
      listenersMap['session.connected']()

      expect(addChannelsMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('publish', () => {
    const params = { channel: 'channel1', message: 'Hello from jest!' }

    it('should publish a chat message', async () => {
      const executeMock = jest
        .spyOn(baseChat._client, 'execute')
        .mockResolvedValueOnce(undefined)

      await expect(baseChat.publish(params)).resolves.toBeUndefined()
      expect(executeMock).toHaveBeenCalledWith({
        method: 'chat.publish',
        params,
      })
    })
  })
})
