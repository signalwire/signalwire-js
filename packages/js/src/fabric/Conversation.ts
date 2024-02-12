import { HTTPClient } from './HTTPClient'
import { WSClient } from './WSClient'
import {
  FetchConversationHistoryResponse,
  GetConversationsOptions,
} from '@signalwire/core'
import { conversationWorker } from './workers'

interface ConversationOptions {
  httpClient: HTTPClient
  wsClient: WSClient
}

export class Conversation {
  private httpClient: HTTPClient
  private wsClient: WSClient
  private subscribers: Map<string, ((update: any) => void)[]> = new Map()

  constructor(options: ConversationOptions) {
    this.httpClient = options.httpClient
    this.wsClient = options.wsClient

    // @ts-ignore
    this.wsClient.clientApi.runWorker('conversationWorker', {
      worker: conversationWorker,
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

  public async subscribeToUpdates(
    subscriberId: string,
    callback: (update: any[]) => void
  ) {
    // Connect the websocket client first
    this.wsClient.connect()

    if (this.subscribers.has(subscriberId)) {
      const subscriberCallbacks = this.subscribers.get(subscriberId)!
      this.subscribers.set(subscriberId, [...subscriberCallbacks, callback])
      return
    }

    this.subscribers.set(subscriberId, [callback])
  }

  // @ts-expect-error
  private handleEvent(event: any) {
    const { subscriberId } = event
    const subscriberCallbacks = this.subscribers.get(subscriberId)
    subscriberCallbacks?.forEach((callback) => {
      // Send a copy to avoid unintentional modifications
      callback([...event])
    })
  }
}
