import { Conversation } from './Conversation'
import { ConversationAPI } from './ConversationAPI'
import { HTTPClient } from './HTTPClient'
import { WSClient } from './WSClient'
import { uuid } from '@signalwire/core'

const displayName = 'subscriber-name'
const mock_getAddressSpy = jest.fn(() =>
  Promise.resolve({ display_name: displayName })
)

// Mock HTTPClient
jest.mock('./HTTPClient', () => {
  return {
    HTTPClient: jest.fn().mockImplementation(() => {
      return {
        fetch: jest.fn(),
        fetchSubscriberInfo: jest.fn(() =>
          Promise.resolve({ id: 'subscriber-id' })
        ),
        getAddress: mock_getAddressSpy,
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
        runWorker: jest.fn(),
      }
    }),
  }
})

describe('Conversation', () => {
  let conversation: Conversation
  let httpClient: HTTPClient
  let wsClient: WSClient

  beforeEach(async () => {
    httpClient = new HTTPClient({
      token: '....',
    })
    wsClient = new WSClient({
      token: '....',
    })
    await wsClient.connect()
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
    it('should register the callback', async () => {
      const callback = jest.fn()
      await conversation.subscribe(callback)

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

      await conversation.subscribe(mockCallback1)
      await conversation.subscribe(mockCallback2)

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
    beforeEach(() => {
      jest.clearAllMocks()
    })

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
      expect(mock_getAddressSpy).toHaveBeenCalledTimes(0)
      expect(messages.data[0].conversation_id).toEqual(addressId)
    })

    it('Should return 10(default page) adresss chat messages only', async () => {
      ;(httpClient.fetch as jest.Mock).mockResolvedValue({
        body: {
          data: [
            { subtype: 'log', conversation_id: 'abc' },
            { subtype: 'chat', conversation_id: 'abc', from_address_id: 'fa1' },
            { subtype: 'chat', conversation_id: 'abc', from_address_id: 'fa1' },
            { subtype: 'chat', conversation_id: 'abc', from_address_id: 'fa1' },
            { subtype: 'chat', conversation_id: 'xyz', from_address_id: 'fa1' },
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
      expect(mock_getAddressSpy).toHaveBeenCalledTimes(1) // since all message are from same address
      expect(messages.data.every((item) => item.subtype === 'chat')).toBe(true)
      expect(
        messages.data.every((item) => item.conversation_id === addressId)
      ).toBe(true)
      console.log(messages.data)
      expect(
        messages.data.every((item) => item.user_name === displayName)
      ).toBe(true)
    })

    it('Should return 10(default page) adresses chat messages only, on next', async () => {
      ;(httpClient.fetch as jest.Mock).mockResolvedValue({
        body: {
          data: [
            { subtype: 'log', conversation_id: 'abc' },
            { subtype: 'chat', conversation_id: 'abc', from_address_id: 'fa1' },
            { subtype: 'chat', conversation_id: 'abc', from_address_id: 'fa2' },
            { subtype: 'chat', conversation_id: 'abc', from_address_id: 'fa3' },
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

      expect(mock_getAddressSpy).toHaveBeenCalledTimes(3) // since we have 3 distinct from


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
      expect(mock_getAddressSpy).toHaveBeenCalledTimes(0) // messages without from_address_id should not try to resolve the address


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
              {
                subtype: 'chat',
                conversation_id: 'abc',
                from_address_id: 'fa1',
              },
              {
                subtype: 'chat',
                conversation_id: 'xyz',
                from_address_id: 'fa1',
              },
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

      expect(mock_getAddressSpy).toHaveBeenCalledTimes(1) // since all messages are from same address


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

    it('should register the chat callback', async () => {
      const addressId = 'abc'
      const mockCallback = jest.fn()
      await conversation.subscribeChatMessages({
        addressId,
        onMessage: mockCallback,
      })

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
        address_id: 'text_address_id',
        from_address_id: 'test_from_address_id',
      }
      conversation.handleEvent(eventForAddressId1)

      conversation.handleEvent({
        ...eventForAddressId1,
        conversation_id: 'different_id',
        subtype: 'chat',
        type: 'message',
        address_id: '',
        from_address_id: '',
      })

      conversation.handleEvent({
        ...eventForAddressId1,
        conversation_id: 'abc',
        subtype: 'log',
        type: 'message',
        address_id: '',
        from_address_id: '',
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

    describe('user_name cache', () => {
      beforeEach(() => {
        jest.useFakeTimers()
      })

      afterEach(() => {
        jest.useRealTimers()
        jest.clearAllMocks()
      })

      it('Should not fetch new values if cache not expired', async () => {
        ;(httpClient.fetch as jest.Mock).mockResolvedValue({
          body: {
            data: [
              { subtype: 'log', conversation_id: 'abc' },
              {
                subtype: 'chat',
                conversation_id: 'abc',
                from_address_id: 'fa1',
              },
              {
                subtype: 'chat',
                conversation_id: 'abc',
                from_address_id: 'fa1',
              },
              {
                subtype: 'chat',
                conversation_id: 'abc',
                from_address_id: 'fa1',
              },
              {
                subtype: 'chat',
                conversation_id: 'xyz',
                from_address_id: 'fa1',
              },
            ],
            links: {
              next: 'http://next.url',
              prev: 'http://prev.url',
            },
          },
        })

        let username = await (conversation as any).lookupUsername('abc')()
        expect(username).toEqual(displayName)
        expect(mock_getAddressSpy).toHaveBeenCalledTimes(1)

        username = await (conversation as any).lookupUsername('abc')()
        expect(username).toEqual(displayName)
        expect(mock_getAddressSpy).toHaveBeenCalledTimes(1)

        jest.advanceTimersByTime(1000 * 60 * 2)

        username = await (conversation as any).lookupUsername('abc')()
        expect(username).toEqual(displayName)
        expect(mock_getAddressSpy).toHaveBeenCalledTimes(1)
      })

      it('Should fetch new values after cache expired', async () => {
        ;(httpClient.fetch as jest.Mock).mockResolvedValue({
          body: {
            data: [
              { subtype: 'log', conversation_id: 'abc' },
              {
                subtype: 'chat',
                conversation_id: 'abc',
                from_address_id: 'fa1',
              },
              {
                subtype: 'chat',
                conversation_id: 'abc',
                from_address_id: 'fa1',
              },
              {
                subtype: 'chat',
                conversation_id: 'abc',
                from_address_id: 'fa1',
              },
              {
                subtype: 'chat',
                conversation_id: 'xyz',
                from_address_id: 'fa1',
              },
            ],
            links: {
              next: 'http://next.url',
              prev: 'http://prev.url',
            },
          },
        })

        let username = await (conversation as any).lookupUsername('abc')()
        expect(username).toEqual(displayName)
        expect(mock_getAddressSpy).toHaveBeenCalledTimes(1)

        username = await (conversation as any).lookupUsername('abc')()
        expect(username).toEqual(displayName)
        expect(mock_getAddressSpy).toHaveBeenCalledTimes(1)

        jest.advanceTimersByTime(1000 * 60 * 3 + 1)

        username = await (conversation as any).lookupUsername('abc')()
        expect(username).toEqual(displayName)
        expect(mock_getAddressSpy).toHaveBeenCalledTimes(2)

        username = await (conversation as any).lookupUsername('abc')()
        expect(username).toEqual(displayName)
        expect(mock_getAddressSpy).toHaveBeenCalledTimes(2)

        jest.advanceTimersByTime(1000 * 60 * 2)

        username = await (conversation as any).lookupUsername('abc')()
        expect(username).toEqual(displayName)
        expect(mock_getAddressSpy).toHaveBeenCalledTimes(2)
      })
    })
  })

  describe('getChatMessages', () => {
    beforeEach(() => {
      httpClient.getAddress = jest
        .fn()
        .mockImplementation(({ id }) =>
          Promise.resolve({ display_name: `User-${id}` })
        )
    })

    it('should preserve extra messages with pagination', async () => {
      const page1 = {
        data: [
          {
            conversation_id: 'address1',
            subtype: 'chat',
            from_address_id: '1',
          },
          {
            conversation_id: 'address1',
            subtype: 'log',
            from_address_id: '2',
          },
          {
            conversation_id: 'address1',
            subtype: 'chat',
            from_address_id: '3',
          },
        ],
        hasNext: true,
        hasPrev: false,
        nextPage: jest.fn(),
        prevPage: jest.fn(),
        self: jest.fn(),
        firstPage: jest.fn(),
      }

      const page2 = {
        data: [
          {
            conversation_id: 'address1',
            subtype: 'chat',
            from_address_id: '4',
          },
          {
            conversation_id: 'address1',
            subtype: 'chat',
            from_address_id: '5',
          },
        ],
        hasNext: false,
        hasPrev: true,
        nextPage: jest.fn(),
        prevPage: jest.fn(),
        self: jest.fn(),
        firstPage: jest.fn(),
      }

      ;(page1.nextPage as jest.Mock).mockResolvedValue(page2)
      conversation.getConversationMessages = jest.fn().mockResolvedValue(page1)

      const result = await conversation.getChatMessages({
        addressId: 'address1',
        pageSize: 3,
      })

      expect(result.data).toHaveLength(3)
      expect(result.data[0].from_address_id).toBe('1')
      expect(result.data[1].from_address_id).toBe('3')
      expect(result.data[2].from_address_id).toBe('4')
      expect(result.hasNext).toBe(true)

      const nextResult = await result.nextPage()
      expect(nextResult?.data).toHaveLength(1)
      expect(nextResult?.data[0].from_address_id).toBe('5')
    })
  })
})
