import { HTTPClient } from './HTTPClient'
import { WSClient } from './WSClient'
import {
  ConversationEventParams,
  FetchConversationHistoryResponse,
  GetConversationMessagesOptions,
  GetConversationsOptions,
} from '@signalwire/core'
import { conversationWorker } from './workers'

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

  public async getConversations(options?: GetConversationsOptions) {
    try {
      const { limit, since, until, cursor } = options || {}

      const subscriber = await this.httpClient.fetchSubscriberInfo()

      const path = '/conversations'
      const queryParams = new URLSearchParams()
      queryParams.append('fabric_subscriber_id', subscriber.id)
      if (limit) {
        queryParams.append('limit', limit.toString())
      }
      if (since) {
        queryParams.append('since', since.toString())
      }
      if (until) {
        queryParams.append('until', until.toString())
      }
      if (cursor) {
        queryParams.append('cursor', cursor)
      }

      const { body } =
        await this.httpClient.fetch<FetchConversationHistoryResponse>(
          `${path}?${queryParams.toString()}`
        )

      return body
    } catch (error) {
      return new Error('Error fetching the conversation history!')
    }
  }

  public async getConversationMessages(
    options: GetConversationMessagesOptions
  ) {
    try {
      const { addressId, limit, since, until, cursor } = options || {}

      const subscriber = await this.httpClient.fetchSubscriberInfo()

      const path = '/conversations/messages'
      const queryParams = new URLSearchParams()
      queryParams.append('fabric_subscriber_id', subscriber.id)
      if (addressId) {
        queryParams.append('fabric_address_id', addressId)
      }
      if (limit) {
        queryParams.append('limit', limit.toString())
      }
      if (since) {
        queryParams.append('since', since.toString())
      }
      if (until) {
        queryParams.append('until', until.toString())
      }
      if (cursor) {
        queryParams.append('cursor', cursor)
      }

      const { body } =
        await this.httpClient.fetch<FetchConversationHistoryResponse>(
          `${path}?${queryParams.toString()}`
        )

      return body
    } catch (error) {
      return new Error('Error fetching the conversation messages!')
    }
  }

  public async createConversationMessage() {
    try {
      const subscriber = await this.httpClient.fetchSubscriberInfo()

      const path = '/conversations/messages'

      // TODO: Complete the payload
      const payload = {
        fabric_subscriber_id: subscriber.id,
      }

      const { body } =
        await this.httpClient.fetch<FetchConversationHistoryResponse>(path, {
          method: 'POST',
          body: payload,
        })

      return body
    } catch (error) {
      return new Error('Error creating a conversation messages!')
    }
  }

  public async subscribeToUpdates(callback: Callback) {
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
