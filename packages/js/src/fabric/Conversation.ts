import { HTTPClient } from './HTTPClient'
import { WSClient } from './WSClient'
import {
  ConversationEventParams,
  Conversation as ConversationType,
  FetchConversationsResponse,
  GetMessagesOptions,
  GetConversationsOptions,
  GetConversationMessagesOptions,
  FetchConversationMessagesResponse,
  ConversationMessage,
  SendConversationMessageOptions,
  SendConversationMessageResponse,
} from '@signalwire/core'
import { conversationWorker } from './workers'
import { buildPaginatedResult } from '../utils/paginatedResult'
import { makeQueryParamsUrls } from '../utils/makeQueryParamsUrl'

type Callback = (event: ConversationEventParams) => unknown

interface ConversationOptions {
  httpClient: HTTPClient
  wsClient: WSClient
}

export class Conversation {
  private httpClient: HTTPClient
  private wsClient: WSClient
  private callbacks: Callback[] = []

  constructor(options: ConversationOptions) {
    this.httpClient = options.httpClient
    this.wsClient = options.wsClient

    // @ts-expect-error
    this.wsClient.clientApi.runWorker('conversationWorker', {
      worker: conversationWorker,
      initialState: {
        conversation: this,
      },
    })
  }

  public async sendMessage(options: SendConversationMessageOptions) {
    try {
      const {
        conversation_id, text
      } = options
      const path = '/api/fabric/messages'
      const { body } = await this.httpClient.fetch<SendConversationMessageResponse>(path, {
        method: 'POST',
        body: {
          conversation_id,
          text,
        }
      })
      return body
    } catch (error) {
      throw new Error("Error sending message to conversation!", error)
    }
  }

  public async getConversations(options?: GetConversationsOptions) {
    try {
      const { pageSize } = options || {}

      const path = '/api/fabric/conversations'
      const queryParams = new URLSearchParams()
      if (pageSize) {
        queryParams.append('page_size', pageSize.toString())
      }

      const { body } = await this.httpClient.fetch<FetchConversationsResponse>(
        makeQueryParamsUrls(path, queryParams)
      )

      return buildPaginatedResult<ConversationType>(body, this.httpClient.fetch)
    } catch (error) {
      throw new Error('Error fetching the conversation history!', error)
    }
  }

  public async getMessages(options?: GetMessagesOptions) {
    try {
      const { pageSize } = options || {}

      const path = '/api/fabric/messages'
      const queryParams = new URLSearchParams()
      if (pageSize) {
        queryParams.append('page_size', pageSize.toString())
      }

      const { body } =
        await this.httpClient.fetch<FetchConversationMessagesResponse>(
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
    options: GetConversationMessagesOptions
  ) {
    try {
      const { addressId, pageSize } = options || {}

      const path = `/api/fabric/conversations/${addressId}/messages`
      const queryParams = new URLSearchParams()
      if (pageSize) {
        queryParams.append('page_size', pageSize.toString())
      }

      const { body } =
        await this.httpClient.fetch<FetchConversationMessagesResponse>(
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

  public async subscribe(callback: Callback) {
    // Connect the websocket client first
    this.wsClient.connect()

    this.callbacks.push(callback)
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
