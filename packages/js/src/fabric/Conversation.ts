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
  private convoSubscribers: Map<string, Callback[]> = new Map()
  private callbacks: Callback[] = []

  constructor(options: ConversationOptions) {
    this.httpClient = options.httpClient
    this.wsClient = options.wsClient

    // @ts-ignore
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
      console.log('subscriber', subscriber)

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
    options?: GetConversationMessagesOptions
  ) {
    try {
      const { fabricAddressId, limit, since, until, cursor } = options || {}

      const subscriber = await this.httpClient.fetchSubscriberInfo()

      const path = '/conversations/messages'
      const queryParams = new URLSearchParams()
      queryParams.append('fabric_subscriber_id', subscriber.id)
      if (fabricAddressId) {
        queryParams.append('fabric_address_id', fabricAddressId)
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

  public async subscribeToUpdates(callback: Callback, conversationId?: string) {
    // Connect the websocket client first
    this.wsClient.connect()

    this.callbacks.push(callback)

    if (conversationId) {
      if (this.convoSubscribers.has(conversationId)) {
        const convoCallbacks = this.convoSubscribers.get(conversationId)!
        this.convoSubscribers.set(conversationId, [...convoCallbacks, callback])
        return
      }
      this.convoSubscribers.set(conversationId, [callback])
    }
  }

  /** @internal */
  public handleEvent(event: ConversationEventParams) {
    const { conversation_id } = event
    const convoCallbacks = this.convoSubscribers.get(conversation_id) || []

    if (convoCallbacks.length) {
      convoCallbacks.forEach((callback) => {
        callback(event)
      })
    }

    if (this.callbacks.length) {
      this.callbacks?.forEach((callback) => {
        callback(event)
      })
    }
  }
}
