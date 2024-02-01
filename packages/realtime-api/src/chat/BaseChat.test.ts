import { BaseChat } from './BaseChat'

describe('BaseChat', () => {
  // Using 'any' data type to bypass TypeScript checks for private or protected members.
  let swClientMock: any
  let baseChat: any
  const listenOptions = {
    channels: ['channel1', 'channel2'],
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
