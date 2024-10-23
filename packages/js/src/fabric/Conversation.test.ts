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

  describe('joinConversation', () => {
    it('should join a conversation', async () => {
      const addressId = uuid()
      const expectedResponse = {
        table: {
          conversation_id: addressId,
        },
      }
      ;(httpClient.fetch as jest.Mock).mockResolvedValue({
        body: expectedResponse,
      })

      const result = await conversation.joinConversation({
        addressId,
      })

      expect(result).toEqual(expectedResponse)
      expect(httpClient.fetch).toHaveBeenCalledWith(
        '/api/fabric/conversations/join',
        {
          method: 'POST',
          body: {
            conversation_id: addressId,
          },
        }
      )
    })

    it('should handles errors with joinConversation', async () => {
      ;(httpClient.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      try {
        await conversation.joinConversation({
          addressId: uuid(),
        })
        fail('Expected joinConversation to throw error.')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect(error.message).toBe('Error joining a conversation!')
      }
    })
  })

  describe('subscribe', () => {
    it('should connect the WS client and register the callback', async () => {
      const callback = jest.fn()
      await conversation.subscribe(callback)

      expect(wsClient.connect).toHaveBeenCalledTimes(1)
      expect(conversation['callbacks']).toContain(callback)
    })

    it('should unsubscribe the correct callback', async () => {
      const callback1 = jest.fn()
      await conversation.subscribe(callback1)

      const callback2 = jest.fn()
      const { unsubscribe: unsubscribe2 } = await conversation.subscribe(
        callback2
      )

      const callback3 = jest.fn()
      await conversation.subscribe(callback3)

      expect(wsClient.connect).toHaveBeenCalledTimes(3)
      expect(conversation['callbacks']).toContain(callback1)
      expect(conversation['callbacks']).toContain(callback2)
      expect(conversation['callbacks']).toContain(callback3)

      unsubscribe2()

      expect(conversation['callbacks']).toContain(callback1)
      expect(conversation['callbacks']).not.toContain(callback2)
      expect(conversation['callbacks']).toContain(callback3)
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
      const messages = await conversation.getChatMessages({ addressId })

      expect(messages.data).toHaveLength(10)
      expect(messages.data.every((item) => item.subtype === 'chat')).toBe(true)
      expect(
        messages.data.every((item) => item.conversation_id === addressId)
      ).toBe(true)
    })

    it('Should return 10(default page) adresses chat messages only, on next', async () => {
      ;(httpClient.fetch as jest.Mock).mockResolvedValue({
        body: {
          data: [
            { subtype: 'log', conversation_id: 'abc' },
            { subtype: 'chat', conversation_id: 'abc' },
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
      let messages = await conversation.getChatMessages({ addressId })

      expect(messages.data).toHaveLength(10)
      expect(messages.data.every((item) => item.subtype === 'chat')).toBe(true)
      expect(
        messages.data.every((item) => item.conversation_id === addressId)
      ).toBe(true)

      //@ts-ignore
      messages = await messages.nextPage()
      expect(messages.data).toHaveLength(10)
      expect(messages.data.every((item) => item.subtype === 'chat')).toBe(true)
      expect(
        messages.data.every((item) => item.conversation_id === addressId)
      ).toBe(true)
    })

    it('Should return 3 adresses chat messages only', async () => {
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
      const messages = await conversation.getChatMessages({
        addressId,
        pageSize: 3,
      })

      expect(messages.data).toHaveLength(3)
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
      await conversation.subscribeChatMessages({
        addressId,
        onMessage: mockCallback,
      })

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

    it('should connect the WS client and register the chat callback', async () => {
      const addressId = 'abc'
      const mockCallback = jest.fn()
      await conversation.subscribeChatMessages({
        addressId,
        onMessage: mockCallback,
      })

      expect(wsClient.connect).toHaveBeenCalledTimes(1)
      expect(conversation['chatSubscriptions'][addressId]).toContain(
        mockCallback
      )
    })

    it('should cancel the correct chat subscription', async () => {
      const mockCallback1 = jest.fn()
      const mockCallback2 = jest.fn()
      const mockCallback3 = jest.fn()
      const addressId1 = 'abc'
      const addressId2 = 'xyz'
      await conversation.subscribeChatMessages({
        addressId: addressId1,
        onMessage: mockCallback1,
      })
      const subscription2 = await conversation.subscribeChatMessages({
        addressId: addressId1,
        onMessage: mockCallback2,
      })
      await conversation.subscribeChatMessages({
        addressId: addressId2,
        onMessage: mockCallback3,
      })

      expect(conversation['chatSubscriptions'][addressId1]).toContain(
        mockCallback1
      )
      expect(conversation['chatSubscriptions'][addressId1]).toContain(
        mockCallback2
      )
      expect(conversation['chatSubscriptions'][addressId1]).not.toContain(
        mockCallback3
      )
      expect(conversation['chatSubscriptions'][addressId2]).toContain(
        mockCallback3
      )

      const eventForAddressId1 = {
        conversation_id: addressId1,
        conversation_name: 'test_conversation_name',
        details: {},
        hidden: false,
        id: 'test_id',
        kind: 'test_kind',
        metadata: {},
        subtype: 'chat',
        type: 'message',
        text: 'test_text',
        ts: 1,
        user_id: 'test_user_id',
        user_name: 'test_user_name',
      }
      conversation.handleEvent(eventForAddressId1)

      conversation.handleEvent({
        ...eventForAddressId1,
        conversation_id: 'different_id',
        subtype: 'chat',
        type: 'message',
      })

      conversation.handleEvent({
        ...eventForAddressId1,
        conversation_id: 'abc',
        subtype: 'log',
        type: 'message',
      })

      expect(mockCallback1).toHaveBeenCalledWith(eventForAddressId1)
      expect(mockCallback1).toHaveBeenCalledTimes(1)
      expect(mockCallback2).toHaveBeenCalledWith(eventForAddressId1)
      expect(mockCallback2).toHaveBeenCalledTimes(1)
      expect(mockCallback3).not.toHaveBeenCalledWith(eventForAddressId1)
      expect(mockCallback3).toHaveBeenCalledTimes(0)

      subscription2.unsubscribe()
      conversation.handleEvent(eventForAddressId1)

      expect(mockCallback1).toHaveBeenCalledTimes(2)
      expect(mockCallback2).toHaveBeenCalledTimes(1)
      expect(mockCallback3).toHaveBeenCalledTimes(0)
    })
  })
})
