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
        body: { data: ['conversation1', 'conversation2'], links: {} },
      })

      const result = await conversation.getConversations()
      expect(result.data).toEqual(['conversation1', 'conversation2'])
      expect(result.hasNext).toBe(false)
      expect(result.hasPrev).toBe(false)
      expect(httpClient.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/conversations')
      )
    })

    it('should handle errors with getConversations', async () => {
      ;(httpClient.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      try {
        await conversation.getConversations()
        fail('Expected getConversations to throw an error.')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe('Error fetching the conversation history!')
      }
    })
  })

  describe('getConversationMessages', () => {
    it('should fetch conversation  messages', async () => {
      ;(httpClient.fetch as jest.Mock).mockResolvedValue({
        body: {
          data: ['message1', 'message2'],
          links: {
            next: 'http://next.url',
            prev: 'http://prev.url',
          },
        },
      })

      const result = await conversation.getConversationMessages({
        addressId: '123',
      })
      expect(result.data).toEqual(['message1', 'message2'])
      expect(result.hasNext).toBe(true)
      expect(result.hasPrev).toBe(true)
      expect(httpClient.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/conversations/message')
      )
    })

    it('should handle errors with getConversationMessages', async () => {
      ;(httpClient.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      try {
        await conversation.getConversationMessages({
          addressId: '123',
        })
        fail('Expected getConversationMessages to throw an error.')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe('Error fetching the conversation messages!')
      }
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
      expect(httpClient.fetch).toHaveBeenCalledWith(
        '/api/fabric/conversations/messages',
        {
          method: 'POST',
          body: {},
        }
      )
    })

    it('should handles errors with createConversationMessage', async () => {
      ;(httpClient.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      try {
        await conversation.createConversationMessage()
        fail('Expected getConversationMessages to throw an error.')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe('Error creating a conversation messages!')
      }
    })
  })

  describe('subscribe', () => {
    let callback

    it('connects the WS client and registers the callback', async () => {
      callback = jest.fn()
      conversation.subscribe(callback)

      expect(wsClient.connect).toHaveBeenCalledTimes(1)
      expect(conversation['callbacks']).toContain(callback)
    })
  })

  describe('handleEvent', () => {
    it('should call all registered callbacks with the event', async () => {
      const mockCallback1 = jest.fn()
      const mockCallback2 = jest.fn()

      conversation.subscribe(mockCallback1)
      conversation.subscribe(mockCallback2)

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
