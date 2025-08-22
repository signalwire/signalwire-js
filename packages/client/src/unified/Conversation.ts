import type {
  ConversationChatEventParams,
  ConversationEventParams,
} from '@signalwire/core'
import { HTTPClient } from './HTTPClient'
import { WSClient } from './WSClient'
import type {
  GetConversationsResponse,
  GetMessagesParams,
  GetConversationsParams,
  GetConversationMessagesParams,
  GetConversationMessagesResponse,
  ConversationMessage,
  SendConversationMessageParams,
  SendConversationMessageResponse,
  ConversationChatMessage,
  GetMessagesResult,
  GetConversationMessagesResult,
  SendConversationMessageResult,
  GetConversationChatMessageParams,
  GetConversationsResult,
  ConversationSubscribeCallback,
  ConversationChatMessagesSubscribeParams,
  ConversationChatMessagesSubscribeResult,
  GetConversationChatMessageResult,
  JoinConversationParams,
  JoinConversationResult,
  ConversationSubscribeResult,
  GetAddressResponse,
  ConversationChatSubscribeCallback,
} from './interfaces'
import { conversationWorker } from './workers'
import { buildPaginatedResult } from '../utils/paginatedResult'
import { makeQueryParamsUrls } from '../utils/makeQueryParamsUrl'
import { ConversationAPI } from './ConversationAPI'
const DEFAULT_CHAT_MESSAGES_PAGE_SIZE = 10
const CACHE_ITEM_EXPIRATION = 1000 * 60 * 3 // 3 minutes
interface ConversationOptions {
  httpClient: HTTPClient
  wsClient: WSClient
}

const isConversationChatEventParams = (
  event: unknown
): event is ConversationChatEventParams => {
  return (
    typeof event === 'object' &&
    event !== null &&
    'subtype' in event &&
    event.subtype === 'chat'
  )
}

// TODO: Implement a TS contract
export class Conversation {
  private httpClient: HTTPClient
  private wsClient: WSClient
  private callbacks = new Set<ConversationSubscribeCallback>()
  private chatSubscriptions: Record<
    string,
    Set<ConversationChatSubscribeCallback>
  > = {}
  private lookupCache = new Map<
    string,
    { lastRequested: number; promise: Promise<GetAddressResponse> }
  >()

  constructor(options: ConversationOptions) {
    this.httpClient = options.httpClient
    this.wsClient = options.wsClient

    this.wsClient.runWorker('conversationWorker', {
      worker: conversationWorker,
      initialState: {
        conversation: this,
      },
    })
  }

  private lookupUsername(addressId: string) {
    if (
      Date.now() - (this.lookupCache.get(addressId)?.lastRequested ?? 0) >=
      CACHE_ITEM_EXPIRATION
    ) {
      this.lookupCache.set(addressId, {
        lastRequested: Date.now(),
        promise: this.httpClient.getAddress({
          id: addressId,
        }),
      })
    }

    return async () =>
      (await this.lookupCache.get(addressId)?.promise)?.display_name
  }

  /** @internal */
  handleEvent(event: ConversationEventParams) {
    if (isConversationChatEventParams(event)) {
      const chatCallbacks = this.chatSubscriptions[event.group_id]
      if (chatCallbacks?.size) {
        // the backend includes the user_name if is chat event
        chatCallbacks.forEach((cb) =>
          cb(event)
        )
      }
    }

    if (this.callbacks.size) {
      this.callbacks.forEach((callback) => {
        callback(event)
      })
    }
  }

  public async sendMessage(
    params: SendConversationMessageParams
  ): Promise<SendConversationMessageResult> {
    try {
      const { groupId, fromAddressId, text } = params
      const path = '/api/fabric/messages'
      const { body } =
        await this.httpClient.fetch<SendConversationMessageResponse>(path, {
          method: 'POST',
          body: {
            group_id: groupId,
            text,
            from_fabric_address_id: fromAddressId,
            metadata: params.metadata,
            details: params.details,
          },
        })
      return body
    } catch (error) {
      throw new Error('Error sending message to conversation!', error)
    }
  }

  public async getConversations(
    params?: GetConversationsParams
  ): Promise<GetConversationsResult> {
    try {
      const { pageSize } = params || {}

      const path = '/api/fabric/conversations'
      const queryParams = new URLSearchParams()
      if (pageSize) {
        queryParams.append('page_size', pageSize.toString())
      }

      const url = makeQueryParamsUrls(path, queryParams)
      const { body } = await this.httpClient.fetch<GetConversationsResponse>(
        url
      )
      const self = this
      const data = body.data.map(
        (conversation) => new ConversationAPI(self, conversation)
      )
      return buildPaginatedResult({ ...body, data }, this.httpClient.fetch)
    } catch (error) {
      throw new Error('Error fetching the conversation history!', error)
    }
  }

  public async getMessages(
    params?: GetMessagesParams
  ): Promise<GetMessagesResult> {
    try {
      const { pageSize } = params || {}

      const path = '/api/fabric/messages'
      const queryParams = new URLSearchParams()
      if (pageSize) {
        queryParams.append('page_size', pageSize.toString())
      }

      const { body } =
        await this.httpClient.fetch<GetConversationMessagesResponse>(
          makeQueryParamsUrls(path, queryParams)
        )

      return buildPaginatedResult<ConversationMessage>(
        body,
        this.httpClient.fetch
      )
    } catch (error) {
      throw new Error('Error fetching the conversation messages!', error)
    }
  }

  public async getConversationMessages(
    params: GetConversationMessagesParams
  ): Promise<GetConversationMessagesResult> {
    try {
      const { groupId, pageSize } = params || {}

      const path = `/api/fabric/conversations/${groupId}/messages`
      const queryParams = new URLSearchParams()
      if (pageSize) {
        queryParams.append('page_size', pageSize.toString())
      }

      const { body } =
        await this.httpClient.fetch<GetConversationMessagesResponse>(
          makeQueryParamsUrls(path, queryParams)
        )

      return buildPaginatedResult<ConversationMessage>(
        body,
        this.httpClient.fetch
      )
    } catch (error) {
      throw new Error('Error fetching the conversation messages!', error)
    }
  }

  public async getChatMessages(
    params: GetConversationChatMessageParams
  ): Promise<GetConversationChatMessageResult> {
    const { groupId, pageSize = DEFAULT_CHAT_MESSAGES_PAGE_SIZE } = params

    const fetchChatMessagesPage = async (
      fetcherFn?: () => Promise<GetConversationChatMessageResult | undefined>,
      cached: ConversationMessage[] = [],
      isDirectionNext = true
    ): Promise<GetConversationChatMessageResult> => {
      let chatMessages = [...cached]
      const isValid = (item: ConversationMessage) => item.subtype === 'chat'

      let conversationMessages: GetConversationChatMessageResult | undefined
      conversationMessages = await fetcherFn?.()
      let chatOnlyMessages = conversationMessages?.data.filter(isValid) ?? []
      let remaining = pageSize - chatMessages.length
      for (
        let idx = 0;
        idx < chatOnlyMessages.length && idx < remaining;
        idx++
      ) {
        chatMessages.push(chatOnlyMessages[idx])
      }

      while (chatMessages.length < pageSize && conversationMessages?.hasNext) {
        conversationMessages = await (isDirectionNext
          ? conversationMessages?.nextPage()
          : conversationMessages?.prevPage())
        if (!conversationMessages || !conversationMessages.data.length) {
          //over caution in case of a server error, to prevent an infinite loop.
          break
        }

        remaining = pageSize - chatMessages.length
        chatOnlyMessages = conversationMessages.data.filter(isValid)
        for (
          let idx = 0;
          idx < chatOnlyMessages.length && idx < remaining;
          idx++
        ) {
          chatMessages.push(chatOnlyMessages[idx])
        }
      }

      let missingReturns: ConversationMessage[] = []
      if (remaining < chatOnlyMessages.length) {
        missingReturns = chatOnlyMessages.slice(remaining)
      }

      chatMessages = await Promise.all(
        chatMessages.map(async (message) => {
          if (!message.from_fabric_address_id) {
            // nothing to lookup
            return message
          }

          return {
            ...message,
            user_name: await this.lookupUsername(message.from_fabric_address_id)(),
          }
        })
      )

      return {
        data: chatMessages as ConversationChatMessage[],
        hasNext: !!conversationMessages?.hasNext || !!missingReturns.length,
        hasPrev: !!conversationMessages?.hasPrev,

        nextPage: () =>
          fetchChatMessagesPage(conversationMessages?.nextPage, missingReturns),
        prevPage: () =>
          fetchChatMessagesPage(
            conversationMessages?.prevPage,
            missingReturns,
            false
          ),
        self: () =>
          fetchChatMessagesPage(conversationMessages?.self, missingReturns),
        firstPage: () =>
          fetchChatMessagesPage(
            conversationMessages?.firstPage,
            missingReturns
          ),
      }
    }

    return fetchChatMessagesPage(
      () =>
        this.getConversationMessages({
          groupId,
          pageSize,
        }) as Promise<GetConversationChatMessageResult>
    )
  }

  public async subscribe(
    callback: ConversationSubscribeCallback
  ): Promise<ConversationSubscribeResult> {
    this.callbacks.add(callback)

    return {
      unsubscribe: () => this.callbacks.delete(callback),
    }
  }

  public async subscribeChatMessages(
    params: ConversationChatMessagesSubscribeParams
  ): Promise<ConversationChatMessagesSubscribeResult> {
    const { addressId, onMessage } = params

    if (!(addressId in this.chatSubscriptions)) {
      this.chatSubscriptions[addressId] = new Set()
    }

    this.chatSubscriptions[addressId].add(onMessage)
    return {
      unsubscribe: () => this.chatSubscriptions[addressId].delete(onMessage),
    }
  }

  public async joinConversation(
    params: JoinConversationParams
  ): Promise<JoinConversationResult> {
    try {
      const { fromAddressId, addressIds } = params
      const path = '/api/fabric/conversations/join'
      const { body } = await this.httpClient.fetch<{
        group_id: string
        fabric_address_ids: string[]
        from_fabric_address_id: string
      }>(path, {
        method: 'POST',
        body: {
          from_fabric_address_id: fromAddressId,
          fabric_address_ids: addressIds,
        },
      })
      return {
        group_id: body.group_id,
        addressIds: body.fabric_address_ids,
        from_fabric_address_id: body.from_fabric_address_id,
      }
    } catch (error) {
      throw new Error('Error joining a conversation!', error)
    }
  }
}
