import { HTTPClient } from './HTTPClient'
import { WSClient } from './WSClient'
import { createHttpClient } from './createHttpClient'
import { Client } from '../Client'
import { RoomSession } from '../RoomSession'
import {
  FetchConversationHistoryResponse,
  GetConversationHistoriOption,
} from '@signalwire/core'

interface ConversationOptions {
  httpClient: HTTPClient
  wsClient: WSClient
}

interface SubscriberInfo {
  callbacks: ((update: any) => void)[]
  history: any[]
}

export class Conversation {
  private httpClient: ReturnType<typeof createHttpClient>
  // @ts-expect-error
  private wsClient: Client<RoomSession>
  private subscribers: Map<string, SubscriberInfo> = new Map()

  constructor(options: ConversationOptions) {
    this.httpClient = options.httpClient.client
    this.wsClient = options.wsClient.client

    // TODO: Initiate the worker here and emit the event every time SDK receives it from the server

    // TODO: Listen for the event and invoke the event handler
  }

  // @ts-expect-error
  private handleEvent(event: any) {
    const { subscriberId } = event
    const subscriberInfo = this.subscribers.get(subscriberId)
    if (subscriberInfo) {
      subscriberInfo.history.push(event)
      this.notifySubscribers(subscriberInfo)
    }
  }

  private notifySubscribers(subscriberInfo: SubscriberInfo) {
    const { callbacks, history } = subscriberInfo
    callbacks.forEach((callback) => {
      // Send a copy to avoid unintentional modifications
      callback([...history])
    })
  }

  public async getConversationHistory(options: GetConversationHistoriOption) {
    const { subscriberId, addressId, limit = 15 } = options

    const path = '/conversations'

    const queryParams = new URLSearchParams()
    queryParams.append('subscriber_id', subscriberId)
    queryParams.append('address_id', addressId)
    queryParams.append('limit', limit.toString())

    const { body } = await this.httpClient<FetchConversationHistoryResponse>(
      `${path}?${queryParams.toString()}`
    )

    const subscriberInfo: SubscriberInfo = {
      callbacks: [],
      history: body.data,
    }

    this.subscribers.set(subscriberId, subscriberInfo)

    return this.buildPaginatedResult(subscriberInfo, body)
  }

  public subscribeToUpdates(
    subscriberId: string,
    callback: (update: any[]) => void
  ) {
    const subscriberInfo = this.subscribers.get(subscriberId)

    if (subscriberInfo) {
      subscriberInfo.callbacks.push(callback)
    }
  }

  private buildPaginatedResult(
    subscriberInfo: SubscriberInfo,
    body: FetchConversationHistoryResponse
  ) {
    const anotherPage = async (url: string) => {
      const { body } = await this.httpClient<any>(url)
      return this.buildPaginatedResult(subscriberInfo, body)
    }

    return {
      addresses: body.data,
      nextPage: async () => {
        const { next } = body.links
        return next ? anotherPage(next) : undefined
      },
      prevPage: async () => {
        const { prev } = body.links
        return prev ? anotherPage(prev) : undefined
      },
      firstPage: async () => {
        const { first } = body.links
        return first ? anotherPage(first) : undefined
      },
      hasNext: Boolean(body.links.next),
      hasPrev: Boolean(body.links.prev),
    }
  }
}
