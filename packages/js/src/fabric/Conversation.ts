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
  CoversationSubscribeCallback,
  ConversationChatMessagesSubsribeParams,
  ConversationChatMessagesSubsribeResult,
  GetConversationChatMessageResult,
} from './types'
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
  private callbacks: CoversationSubscribeCallback[] = [
    (event: ConversationEventParams) => {
      if(event.subtype !== 'chat') return
      const conversationSubscription = this.chatSubscriptions[event.conversation_id];
      if(!!conversationSubscription) {
          conversationSubscription.forEach((cb) => cb(event))
      }
    }
  ]
  private chatSubscriptions: Record<string, CoversationSubscribeCallback[]> = {}

  constructor(options: ConversationOptions) {
    this.httpClient = options.httpClient
    this.wsClient = options.wsClient

    this.wsClient.clientApi.runWorker('conversationWorker', {
      worker: conversationWorker,
      initialState: {
        conversation: this,
      },
    })
  }

  public async sendMessage(
    options: SendConversationMessageParams
  ): Promise<SendConversationMessageResult> {
    try {
      const { addressId, text } = options
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
    options?: GetConversationsParams
  ): Promise<GetConversationsResult> {
    try {
      const { pageSize } = options || {}

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
    options?: GetMessagesParams
  ): Promise<GetMessagesResult> {
    try {
      const { pageSize } = options || {}

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
    options: GetConversationMessagesParams
  ): Promise<GetConversationMessagesResult> {
    try {
      const { addressId, pageSize } = options || {}

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
    const chatMessages = []
    const isValid = (item: ConversationMessage) => (item.conversation_id == addressId && item.subtype == 'chat')

    let conversationMessages: Awaited<ReturnType<typeof this.getConversationMessages>> | undefined
    conversationMessages = await this.getConversationMessages({addressId, pageSize});
     chatMessages.push(...conversationMessages.data.filter(isValid))
     while(chatMessages.length < pageSize && conversationMessages?.hasNext) {
      conversationMessages = await conversationMessages?.nextPage() 
      if(!!conversationMessages) {
        chatMessages.push(...conversationMessages.data.filter(isValid))
      }
     }
    
    return { 
      data: chatMessages as ConversationChatMessage[],
      hasNext: !!conversationMessages?.hasNext,
      hasPrev: !!conversationMessages?.hasPrev,
      // @ts-expect-error
      nextPage: conversationMessages?.nextPage,
      // @ts-expect-error
      prevPage: conversationMessages?.prevPage,
    }
  }

  public async subscribe(callback: CoversationSubscribeCallback) {
    // Connect the websocket client first
    this.wsClient.connect()

    this.callbacks.push(callback)
  }

  public async subscribeChatMessages(
    params: ConversationChatMessagesSubsribeParams
  ): Promise<ConversationChatMessagesSubsribeResult> {
    const { addressId, onMessage } = params

    // Connect the websocket client first
    await this.wsClient.connect()

    if(!(addressId in this.chatSubscriptions)) {
      this.chatSubscriptions[addressId] = []
    }

    this.chatSubscriptions[addressId].push(onMessage);
    const subscriptionIndex = this.chatSubscriptions[addressId].length - 1
    return {
      cancel: () => this.chatSubscriptions[addressId].splice(subscriptionIndex, 1)
    }
  }

  /** @internal */
  public handleEvent(event: ConversationEventParams) {
    if (this.callbacks.length) {
      this.callbacks.forEach((callback) => {
        callback(event)
      })
    }
  }
}
