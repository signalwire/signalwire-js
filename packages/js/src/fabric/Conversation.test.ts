import { Conversation } from './Conversation'
import { HTTPClient } from './HTTPClient'
import { WSClient } from './WSClient'

// Mock HTTPClient
jest.mock('./HTTPClient', () => {
  return {
    HTTPClient: jest.fn().mockImplementation(() => {
      return {
        fetch: jest.fn(),
        fetchSubscriberInfo: jest.fn(() =>
          Promise.resolve({ id: 'subscriber-id' })
        ),
      }
    }),
  }
})

// Mock WSClient
jest.mock('./WSClient', () => {
  return {
    WSClient: jest.fn().mockImplementation(() => {
      return {
        connect: jest.fn(),
        clientApi: {
          runWorker: jest.fn(),
        },
      }
    }),
  }
})

describe('Conversation', () => {
  let conversation: Conversation
  let httpClient: HTTPClient
  let wsClient: WSClient

  beforeEach(() => {
    httpClient = new HTTPClient({
      token: '....',
    })
    wsClient = new WSClient({
      token: '....',
    })
    conversation = new Conversation({ httpClient, wsClient })
  })

  describe('getConversations', () => {
    it('should fetch conversations', async () => {
      ;(httpClient.fetch as jest.Mock).mockResolvedValue({
        body: { conversations: ['conversation1', 'conversation2'] },
      })

      const result = await conversation.getConversations()
      expect(result).toEqual({
        conversations: ['conversation1', 'conversation2'],
      })
      expect(httpClient.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/conversations')
      )
    })

    it('should handle errors with getConversations', async () => {
      ;(httpClient.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      const result = await conversation.getConversations()
      expect(result).toBeInstanceOf(Error)
      expect((result as Error).message).toBe(
        'Error fetching the conversation history!'
      )
    })
  })

  describe('getConversationMessages', () => {
    it('should fetch conversation  messages', async () => {
      ;(httpClient.fetch as jest.Mock).mockResolvedValue({
        body: { messages: ['message1', 'message2'] },
      })

      const result = await conversation.getConversationMessages({
        addressId: '123',
      })
      expect(result).toEqual({
        messages: ['message1', 'message2'],
      })
      expect(httpClient.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/conversations/message')
      )
    })

    it('should handle errors with getConversationMessages', async () => {
      ;(httpClient.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      const result = await conversation.getConversationMessages({
        addressId: '123',
      })
      expect(result).toBeInstanceOf(Error)
      expect((result as Error).message).toBe(
        'Error fetching the conversation messages!'
      )
    })
  })

  describe('createConversationMessage', () => {
    it('should create a conversation message', async () => {
      const expectedResponse = { success: true, messageId: '12345' }
      ;(httpClient.fetch as jest.Mock).mockResolvedValue({
        body: expectedResponse,
      })

      // TODO: Test with payload
      const result = await conversation.createConversationMessage()

      expect(result).toEqual(expectedResponse)
      expect(httpClient.fetchSubscriberInfo).toHaveBeenCalled()
      expect(httpClient.fetch).toHaveBeenCalledWith('/conversations/messages', {
        method: 'POST',
        body: { fabric_subscriber_id: 'subscriber-id' },
      })
    })

    it('should handles errors with createConversationMessage', async () => {
      ;(httpClient.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      const result = await conversation.createConversationMessage()

      expect(result).toBeInstanceOf(Error)
      expect((result as Error).message).toBe(
        'Error creating a conversation messages!'
      )
      expect(httpClient.fetchSubscriberInfo).toHaveBeenCalled()
    })
  })

  describe('subscribeToUpdates', () => {
    let callback

    it('connects the WS client and registers the callback', async () => {
      callback = jest.fn()
      conversation.subscribeToUpdates(callback)

      expect(wsClient.connect).toHaveBeenCalledTimes(1)
      expect(conversation['callbacks']).toContain(callback)
    })
  })

  describe('handleEvent', () => {
    it('should call all registered callbacks with the event', async () => {
      const mockCallback1 = jest.fn()
      const mockCallback2 = jest.fn()

      conversation.subscribeToUpdates(mockCallback1)
      conversation.subscribeToUpdates(mockCallback2)

      const event = {
        type: 'conversation.message',
        message: 'Test message',
      }
      // @ts-expect-error
      conversation.handleEvent(event)

      expect(mockCallback1).toHaveBeenCalledWith(event)
      expect(mockCallback2).toHaveBeenCalledWith(event)
    })
  })
})
