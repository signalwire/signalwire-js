import { type ConversationEventParams } from '@signalwire/core'
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
  JoinConversationResponse,
  JoinConversationResult,
  ConversationSubscribeResult,
} from './interfaces'
import { conversationWorker } from './workers'
import { buildPaginatedResult } from '../utils/paginatedResult'
import { makeQueryParamsUrls } from '../utils/makeQueryParamsUrl'
import { ConversationAPI } from './ConversationAPI'

const DEFAULT_CHAT_MESSAGES_PAGE_SIZE = 10

interface ConversationOptions {
  httpClient: HTTPClient
  wsClient: WSClient
}

export class Conversation {
  private httpClient: HTTPClient
  private wsClient: WSClient
  private callbacks = new Set<ConversationSubscribeCallback>()
  private chatSubscriptions: Record<
    string,
    Set<ConversationSubscribeCallback>
  > = {}

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

  /** @internal */
  handleEvent(event: ConversationEventParams) {
    if (event.subtype === 'chat') {
      const chatCallbacks = this.chatSubscriptions[event.conversation_id]
      if (chatCallbacks?.size) {
        chatCallbacks.forEach((cb) => cb(event))
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
      const { addressId, text } = params
      const path = '/api/fabric/messages'
      const { body } =
        await this.httpClient.fetch<SendConversationMessageResponse>(path, {
          method: 'POST',
          body: {
            conversation_id: addressId,
            text,
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

      const { body } = await this.httpClient.fetch<GetConversationsResponse>(
        makeQueryParamsUrls(path, queryParams)
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
      const { addressId, pageSize } = params || {}

      const path = `/api/fabric/conversations/${addressId}/messages`
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
    const { addressId, pageSize = DEFAULT_CHAT_MESSAGES_PAGE_SIZE } = params

    const fetchChatMessagesPage = async (
      fetcherFn?: () => Promise<GetConversationChatMessageResult | undefined>,
      cached: ConversationMessage[] = [],
      isDirectionNext = true
    ): Promise<GetConversationChatMessageResult> => {
      const chatMessages = [...cached]
      const isValid = (item: ConversationMessage) =>
        item.conversation_id === addressId && item.subtype === 'chat'

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

      return {
        data: chatMessages as ConversationChatMessage[],
        hasNext: !!conversationMessages?.hasNext || !!cached.length,
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
          addressId,
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
      const { addressId } = params
      const path = '/api/fabric/conversations/join'
      const { body } = await this.httpClient.fetch<JoinConversationResponse>(
        path,
        {
          method: 'POST',
          body: {
            conversation_id: addressId,
          },
        }
      )
      return body
    } catch (error) {
      throw new Error('Error joining a conversation!', error)
    }
  }
}
