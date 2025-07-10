import { Conversation } from './Conversation'
import { ConversationAPI } from './ConversationAPI'
import { HTTPClient } from './HTTPClient'
import { WSClient } from './WSClient'
import { uuid } from '@signalwire/core'

const displayName = 'subscriber-name'
const mock_getAddressSpy = jest.fn(() =>
  Promise.resolve({ 
    display_name: displayName,
    id: 'addr-id',
    name: 'Address Name',
    resource_id: 'resource-id',
    type: 'type' as any,
    channels: [],
    cover_url: '',
    preview_url: ''
  })
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
          data: [
            { text: 'message1', from_address_id: 'addr1' },
            { text: 'message2', from_address_id: 'addr2' }
          ],
          links: {
            next: 'http://next.url',
            prev: 'http://prev.url',
          },
        },
      })

      const result = await conversation.getMessages()
      expect(result.data).toEqual([
        { text: 'message1', fromAddressId: 'addr1' },
        { text: 'message2', fromAddressId: 'addr2' }
      ])
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
        groupId: '1234',
      })
      expect(result.data).toEqual(['message1', 'message2'])
      expect(result.hasNext).toBe(true)
      expect(result.hasPrev).toBe(true)
      expect(httpClient.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/fabric/conversations/1234/messages')
      )
    })

    it('should handle errors with getConversationMessages', async () => {
      ;(httpClient.fetch as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      try {
        await conversation.getConversationMessages({
          groupId: '1234',
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
      const groupId = uuid()
      const fromAddressId = uuid()
      const text = 'test message'
      const expectedResponse = {
        table: {
          text,
          conversation_id: groupId,
        },
      }
      ;(httpClient.fetch as jest.Mock).mockResolvedValue({
        body: expectedResponse,
      })

      // TODO: Test with payload
      const result = await conversation.sendMessage({
        groupId,
        fromAddressId,
        text,
      })

      expect(result).toEqual(expectedResponse)
      expect(httpClient.fetch).toHaveBeenCalledWith('/api/fabric/messages', {
        method: 'POST',
        body: {
          group_id: groupId,
          from_address_id: fromAddressId,
          text,
          metadata: undefined,
          details: undefined,
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
          groupId: uuid(),
          fromAddressId: uuid(),
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
      const fromAddressId = uuid()
      const addressIds = [uuid(), uuid()]
      const groupId = uuid()
      const expectedResponse = {
        group_id: groupId,
        fabric_address_ids: addressIds,
        from_fabric_address_id: fromAddressId,
      }
      ;(httpClient.fetch as jest.Mock).mockResolvedValue({
        body: expectedResponse,
      })

      const result = await conversation.joinConversation({
        fromAddressId,
        addressIds,
      })

      expect(result).toEqual({
        groupId,
        addressIds,
        fromAddressId,
      })
      expect(httpClient.fetch).toHaveBeenCalledWith(
        '/api/fabric/conversations/join',
        {
          method: 'POST',
          body: {
            from_fabric_address_id: fromAddressId,
            fabric_address_ids: addressIds,
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
          fromAddressId: uuid(),
          addressIds: [uuid()],
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
      // Reset the mock to use the spy
      httpClient.getAddress = mock_getAddressSpy
    })

    it('Should return adresss chat messages only', async () => {
      // Mock getConversationMessages to return properly typed data
      jest.spyOn(conversation, 'getConversationMessages').mockResolvedValue({
        data: [
          { subtype: 'log', groupId: 'abc' } as any,
          { subtype: 'chat', groupId: 'abc' } as any,
          { subtype: 'chat', groupId: 'abc' } as any,
        ],
        hasNext: false,
        hasPrev: false,
        nextPage: jest.fn(),
        prevPage: jest.fn(),
        self: jest.fn(),
        firstPage: jest.fn(),
      })

      const groupId = 'abc'
      const messages = await conversation.getChatMessages({ groupId })

      expect(messages.data).toHaveLength(2)
      expect(mock_getAddressSpy).toHaveBeenCalledTimes(0)
      // Check if messages have the expected structure
      expect(messages.data[0]).toHaveProperty('subtype', 'chat')
      expect(messages.data.every((item) => item.groupId === groupId)).toBe(true)
    })

    it('Should return 10(default page) adresss chat messages only', async () => {
      // Mock getConversationMessages to return properly typed data
      jest.spyOn(conversation, 'getConversationMessages').mockResolvedValue({
        data: [
          { subtype: 'log', groupId: 'abc', fromAddressId: 'fa1' } as any,
          { subtype: 'chat', groupId: 'abc', fromAddressId: 'fa1' } as any,
          { subtype: 'chat', groupId: 'abc', fromAddressId: 'fa1' } as any,
          { subtype: 'chat', groupId: 'abc', fromAddressId: 'fa1' } as any,
          { subtype: 'chat', groupId: 'abc', fromAddressId: 'fa1' } as any,
          { subtype: 'chat', groupId: 'abc', fromAddressId: 'fa1' } as any,
          { subtype: 'chat', groupId: 'abc', fromAddressId: 'fa1' } as any,
          { subtype: 'chat', groupId: 'abc', fromAddressId: 'fa1' } as any,
          { subtype: 'chat', groupId: 'abc', fromAddressId: 'fa1' } as any,
          { subtype: 'chat', groupId: 'abc', fromAddressId: 'fa1' } as any,
          { subtype: 'chat', groupId: 'abc', fromAddressId: 'fa1' } as any,
        ],
        hasNext: false,
        hasPrev: false,
        nextPage: jest.fn(),
        prevPage: jest.fn(),
        self: jest.fn(),
        firstPage: jest.fn(),
      })

      const groupId = 'abc'
      const messages = await conversation.getChatMessages({ groupId })

      expect(messages.data).toHaveLength(10)
      expect(mock_getAddressSpy).toHaveBeenCalledTimes(1) // since all message are from same address
      expect(messages.data.every((item) => item.subtype === 'chat')).toBe(true)
      expect(
        messages.data.every((item) => item.groupId === groupId)
      ).toBe(true)
      expect(
        messages.data.every((item) => item.user_name === displayName)
      ).toBe(true)
    })

    it.skip('Should return 10(default page) adresses chat messages only, on next', async () => {
      // Mock getConversationMessages to return properly typed data
      jest.spyOn(conversation, 'getConversationMessages').mockResolvedValue({
        data: [
          { subtype: 'log', groupId: 'abc', fromAddressId: 'fa1' } as any,
          { subtype: 'chat', groupId: 'abc', fromAddressId: 'fa1' } as any,
          { subtype: 'chat', groupId: 'abc', fromAddressId: 'fa2' } as any,
          { subtype: 'chat', groupId: 'abc', fromAddressId: 'fa3' } as any,
          { subtype: 'chat', groupId: 'abc', fromAddressId: 'fa1' } as any,
          { subtype: 'chat', groupId: 'abc', fromAddressId: 'fa2' } as any,
          { subtype: 'chat', groupId: 'abc', fromAddressId: 'fa3' } as any,
          { subtype: 'chat', groupId: 'abc', fromAddressId: 'fa1' } as any,
          { subtype: 'chat', groupId: 'abc', fromAddressId: 'fa2' } as any,
          { subtype: 'chat', groupId: 'abc', fromAddressId: 'fa3' } as any,
          { subtype: 'chat', groupId: 'abc', fromAddressId: 'fa1' } as any,
        ],
        hasNext: false,
        hasPrev: false,
        nextPage: jest.fn(),
        prevPage: jest.fn(),
        self: jest.fn(),
        firstPage: jest.fn(),
      })

      const groupId = 'abc'
      let messages = await conversation.getChatMessages({ groupId })

      expect(messages.data).toHaveLength(10)

      expect(mock_getAddressSpy).toHaveBeenCalledTimes(3) // since we have 3 distinct from


      expect(messages.data.every((item) => item.subtype === 'chat')).toBe(true)
      expect(
        messages.data.every((item) => item.groupId === groupId)
      ).toBe(true)

      //@ts-ignore
      messages = await messages.nextPage()
      expect(messages.data).toHaveLength(10)
      expect(messages.data.every((item) => item.subtype === 'chat')).toBe(true)
      expect(
        messages.data.every((item) => item.groupId === groupId)
      ).toBe(true)
    })

    it('Should return 3 adresses chat messages only', async () => {
      // Mock getConversationMessages to return properly typed data
      jest.spyOn(conversation, 'getConversationMessages').mockResolvedValue({
        data: [
          { subtype: 'log', groupId: 'abc' } as any,
          { subtype: 'chat', groupId: 'abc' } as any,
          { subtype: 'chat', groupId: 'abc' } as any,
          { subtype: 'chat', groupId: 'abc' } as any,
        ],
        hasNext: false,
        hasPrev: false,
        nextPage: jest.fn(),
        prevPage: jest.fn(),
        self: jest.fn(),
        firstPage: jest.fn(),
      })

      const groupId = 'abc'
      const messages = await conversation.getChatMessages({
        groupId,
        pageSize: 3,
      })

      expect(messages.data).toHaveLength(3)
      expect(mock_getAddressSpy).toHaveBeenCalledTimes(0) // messages without from_address_id should not try to resolve the address


      expect(messages.data.every((item) => item.subtype === 'chat')).toBe(true)
      expect(
        messages.data.every((item) => item.groupId === groupId)
      ).toBe(true)
    })

    it('Should return 3 adresss chat messages only', async () => {
      let count = 0
      const mockGetConversationMessages = jest.spyOn(conversation, 'getConversationMessages')
      mockGetConversationMessages.mockImplementation(() => {
        ++count
        if (count === 1) {
          return Promise.resolve({
            data: [
              { subtype: 'log', groupId: 'abc' } as any,
              {
                subtype: 'chat',
                groupId: 'abc',
                fromAddressId: 'fa1',
              } as any,
              {
                subtype: 'chat',
                groupId: 'abc',
                fromAddressId: 'fa1',
              } as any,
            ],
            hasNext: true,
            hasPrev: false,
            nextPage: jest.fn().mockResolvedValue({
              data: [
                {
                  subtype: 'chat',
                  groupId: 'abc',
                  fromAddressId: 'fa1',
                } as any,
              ],
              hasNext: false,
              hasPrev: true,
              nextPage: jest.fn(),
              prevPage: jest.fn(),
              self: jest.fn(),
              firstPage: jest.fn(),
            }),
            prevPage: jest.fn(),
            self: jest.fn(),
            firstPage: jest.fn(),
          })
        } else {
          return Promise.resolve({
            data: [
              {
                subtype: 'chat',
                groupId: 'abc',
                fromAddressId: 'fa1',
              } as any,
            ],
            hasNext: false,
            hasPrev: true,
            nextPage: jest.fn(),
            prevPage: jest.fn(),
            self: jest.fn(),
            firstPage: jest.fn(),
          })
        }
      })

      const groupId = 'abc'
      const messages = await conversation.getChatMessages({ groupId })

      expect(messages.data).toHaveLength(3)

      expect(mock_getAddressSpy).toHaveBeenCalledTimes(1) // since all messages are from same address


      expect(messages.data.every((item) => item.subtype === 'chat')).toBe(true)
      expect(
        messages.data.every((item) => item.groupId === groupId)
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
        type: 'message' as const,
        subtype: 'chat' as const,
        group_id: 'abc',
        text: 'text',
        id: 'msg1',
        ts: Date.now(),
        details: {},
        metadata: {},
        hidden: false,
        from_address_id: 'addr1',
      }
      conversation.handleEvent(valid)
      conversation.handleEvent({
        type: 'message' as const,
        subtype: 'chat' as const,
        group_id: 'xyz',
        text: 'text',
        id: 'msg2',
        ts: Date.now(),
        details: {},
        metadata: {},
        hidden: false,
        from_address_id: 'addr2',
      })
      conversation.handleEvent({
        type: 'message' as const,
        subtype: 'log' as const,
        group_id: 'abc',
        id: 'msg3',
        ts: Date.now(),
        details: {},
        metadata: {},
        hidden: false,
        from_address_id: 'addr3',
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
        group_id: addressId1,
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
        from_address_id: 'test_from_address_id',
      }
      conversation.handleEvent(eventForAddressId1)

      conversation.handleEvent({
        ...eventForAddressId1,
        group_id: 'different_id',
        subtype: 'chat',
        type: 'message',
        from_address_id: '',
      })

      conversation.handleEvent({
        ...eventForAddressId1,
        group_id: 'abc',
        subtype: 'log',
        type: 'message',
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
            groupId: 'address1',
            subtype: 'chat',
            fromAddressId: '1',
          },
          {
            groupId: 'address1',
            subtype: 'log',
            fromAddressId: '2',
          },
          {
            groupId: 'address1',
            subtype: 'chat',
            fromAddressId: '3',
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
            groupId: 'address1',
            subtype: 'chat',
            fromAddressId: '4',
          },
          {
            groupId: 'address1',
            subtype: 'chat',
            fromAddressId: '5',
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
        groupId: 'address1',
        pageSize: 3,
      })

      expect(result.data).toHaveLength(3)
      expect(result.data[0].fromAddressId).toBe('1')
      expect(result.data[1].fromAddressId).toBe('3')
      expect(result.data[2].fromAddressId).toBe('4')
      expect(result.hasNext).toBe(true)

      const nextResult = await result.nextPage()
      expect(nextResult?.data).toHaveLength(1)
      expect(nextResult?.data[0].fromAddressId).toBe('5')
    })
  })
})
