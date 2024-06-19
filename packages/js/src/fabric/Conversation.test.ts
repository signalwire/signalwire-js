import { Conversation } from './Conversation'
import { ConversationAPI } from './ConversationAPI'
import { HTTPClient } from './HTTPClient'
import { WSClient } from './WSClient'
import { uuid } from '@signalwire/core'

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
      const conversations = [
        {
          id: uuid(),
          last_message_at: Date.now(),
          created_at: Date.now(),
          metadata: {},
          name: 'convo 1',
        },
        {
          id: uuid(),
          last_message_at: Date.now(),
          created_at: Date.now(),
          metadata: {},
          name: 'convo 2',
        },
      ]
      ;(httpClient.fetch as jest.Mock).mockResolvedValue({
        body: { data: conversations, links: {} },
      })

      const result = await conversation.getConversations()
      result.data.forEach((item, index) => {
        expect(item).toBeInstanceOf(ConversationAPI)
        expect(item.id).toEqual(conversations[index].id)
        expect(item.name).toEqual(conversations[index].name)
      })
      expect(result.hasNext).toBe(false)
      expect(result.hasPrev).toBe(false)
      expect(httpClient.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/conversations')
      )
      expect(result.data[0].sendMessage).not.toBeUndefined()
      expect(typeof result.data[0].sendMessage).toBe('function')
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

  describe('getMessages', () => {
    it('should fetch conversation messages', async () => {
      ;(httpClient.fetch as jest.Mock).mockResolvedValue({
        body: {
          data: ['message1', 'message2'],
          links: {
            next: 'http://next.url',
            prev: 'http://prev.url',
          },
        },
      })

      const result = await conversation.getMessages()
      expect(result.data).toEqual(['message1', 'message2'])
      expect(result.hasNext).toBe(true)
      expect(result.hasPrev).toBe(true)
      expect(httpClient.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/message')
      )
    })

    it('should handle errors with getMessages', async () => {
      ;(httpClient.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      try {
        await conversation.getMessages()
        fail('Expected getMessages to throw an error.')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe('Error fetching the conversation messages!')
      }
    })
  })

  describe('getConversationMessages', () => {
    it('should fetch conversation messages', async () => {
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
        addressId: '1234',
      })
      expect(result.data).toEqual(['message1', 'message2'])
      expect(result.hasNext).toBe(true)
      expect(result.hasPrev).toBe(true)
      expect(httpClient.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/conversations/1234/messages')
      )
    })

    it('should handle errors with getConversationMessages', async () => {
      ;(httpClient.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      try {
        await conversation.getConversationMessages({
          addressId: '1234',
        })
        fail('Expected getConversationMessages to throw an error.')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe('Error fetching the conversation messages!')
      }
    })
  })

  describe('sendMessage', () => {
    it('should create a conversation message', async () => {
      const addressId = uuid()
      const text = 'test message'
      const expectedResponse = {
        table: {
          text,
          conversation_id: addressId,
        },
      }
      ;(httpClient.fetch as jest.Mock).mockResolvedValue({
        body: expectedResponse,
      })

      // TODO: Test with payload
      const result = await conversation.sendMessage({
        addressId,
        text,
      })

      expect(result).toEqual(expectedResponse)
      expect(httpClient.fetch).toHaveBeenCalledWith('/api/fabric/messages', {
        method: 'POST',
        body: {
          conversation_id: addressId,
          text,
        },
      })
    })

    it('should handles errors with createConversationMessage', async () => {
      ;(httpClient.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      try {
        await conversation.sendMessage({
          text: 'text message',
          addressId: uuid(),
        })
        fail('Expected sendMessage to throw error.')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe('Error sending message to conversation!')
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

  describe('Chat utilities', () => {
    it('Should return adresss chat messages only', async () => {
      ;(httpClient.fetch as jest.Mock).mockResolvedValue({
        body: {
          data: [
            { subtype: 'log', conversation_id: 'abc' },
            { subtype: 'chat', conversation_id: 'abc' },
            { subtype: 'chat', conversation_id: 'xyz' },
          ],
          links: {},
        },
      })

      const addressId = 'abc'
      const messages = await conversation.getChatMessages({ addressId })

      expect(messages.data).toHaveLength(1)
      expect(messages.data[0].conversation_id).toEqual(addressId)
    })

    it('Should return 10(default page) adresss chat messages only', async () => {
      ;(httpClient.fetch as jest.Mock).mockResolvedValue({
        body: {
          data: [
            { subtype: 'log', conversation_id: 'abc' },
            { subtype: 'chat', conversation_id: 'abc' },
            { subtype: 'chat', conversation_id: 'xyz' },
          ],
          links: {
            next: 'http://next.url',
            prev: 'http://prev.url',
          },
        },
      })

      const addressId = 'abc'
      const messages = await conversation.getChatMessages({ addressId })

      expect(messages.data).toHaveLength(10)
      expect(messages.data.every((item) => item.subtype === 'chat')).toBe(true)
      expect(
        messages.data.every((item) => item.conversation_id === addressId)
      ).toBe(true)
    })

    it('Should return 5 adresss chat messages only', async () => {
      ;(httpClient.fetch as jest.Mock).mockResolvedValue({
        body: {
          data: [
            { subtype: 'log', conversation_id: 'abc' },
            { subtype: 'chat', conversation_id: 'abc' },
            { subtype: 'chat', conversation_id: 'abc' },
            { subtype: 'chat', conversation_id: 'xyz' },
          ],
          links: {
            next: 'http://next.url',
            prev: 'http://prev.url',
          },
        },
      })

      const addressId = 'abc'
      const messages = await conversation.getChatMessages({ addressId, pageSize:3 })

      expect(messages.data).toHaveLength(4)
      expect(messages.data.every((item) => item.subtype === 'chat')).toBe(true)
      expect(
        messages.data.every((item) => item.conversation_id === addressId)
      ).toBe(true)
    })

    it('Should return 3 adresss chat messages only', async () => {
      let count = 0
      ;(httpClient.fetch as jest.Mock).mockImplementation(() => {
        ++count
        return {
          body: {
            data: [
              { subtype: 'log', conversation_id: 'abc' },
              { subtype: 'chat', conversation_id: 'abc' },
              { subtype: 'chat', conversation_id: 'xyz' },
            ],
            links: {
              next: count < 3 ? 'http://next.url' : undefined,
              prev: count < 3 ? 'http://prev.url' : undefined,
            },
          },
        }
      })

      const addressId = 'abc'
      const messages = await conversation.getChatMessages({ addressId })

      expect(messages.data).toHaveLength(3)
      expect(messages.data.every((item) => item.subtype === 'chat')).toBe(true)
      expect(
        messages.data.every((item) => item.conversation_id === addressId)
      ).toBe(true)
    })

    it('should get only address chat event', async () => {
      const mockCallback = jest.fn()
      const addressId = 'abc'
      await conversation.subscribeChatMessages({addressId, onMessage: mockCallback})
      
      const valid = {
        type: 'message',
        subtype: 'chat',
        conversation_id: 'abc',
        text: 'text',
      }
      //@ts-expect-error
      conversation.handleEvent(valid)
      //@ts-expect-error
      conversation.handleEvent({
        type: 'message',
        subtype: 'chat',
        conversation_id: 'xyz',
        text: 'text',
      })
      //@ts-expect-error
      conversation.handleEvent({
        type: 'message',
        subtype: 'log',
        conversation_id: 'abc',
      })

      expect(mockCallback).toHaveBeenCalledWith(valid)
    })

    it('should cancel chat address subscription', async () => {
      const mockCallback = jest.fn()
      const addressId = 'abc'
      const subscription = await conversation.subscribeChatMessages({addressId, onMessage: mockCallback})
      
      const valid = {
        type: 'message',
        subtype: 'chat',
        conversation_id: 'abc',
        text: 'text',
      }
      //@ts-expect-error
      conversation.handleEvent(valid)
      //@ts-expect-error
      conversation.handleEvent({
        type: 'message',
        subtype: 'chat',
        conversation_id: 'xyz',
        text: 'text',
      })
      //@ts-expect-error
      conversation.handleEvent({
        type: 'message',
        subtype: 'log',
        conversation_id: 'abc',
      })

      expect(mockCallback).toHaveBeenCalledWith(valid)

      subscription.cancel()
      //@ts-expect-error
      conversation.handleEvent(valid)
      expect(mockCallback).toBeCalledTimes(1)
    })
  })
})
