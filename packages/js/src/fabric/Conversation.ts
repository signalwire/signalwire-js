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
  GetAddressResponse,
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

// TODO: Implement a TS contract
export class Conversation {
  private httpClient: HTTPClient
  private wsClient: WSClient
  private callbacks = new Set<ConversationSubscribeCallback>()
  private chatSubscriptions: Record<
    string,
    Set<ConversationSubscribeCallback>
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
    if (event.subtype === 'chat') {
      const chatCallbacks = this.chatSubscriptions[event.group_id]
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
    _params: SendConversationMessageParams
  ): Promise<SendConversationMessageResult> {
    throw new Error(
      'This version Conversation.sendMessage is unsupported by the backend. Use @signalwire/client instead.'
    )
  }

  public async getConversations(
    _params?: GetConversationsParams
  ): Promise<GetConversationsResult> {
    throw new Error(
      'This version Conversation.getConversations is unsupported by the backend. Use @signalwire/client instead.'
    )
  }

  public async getMessages(
    params?: GetMessagesParams
  ): Promise<GetMessagesResult> {
    throw new Error(
      'This version Conversation.getMessages is unsupported by the backend. Use @signalwire/client instead.'
    )
  }

  public async getConversationMessages(
    _params: GetConversationMessagesParams
  ): Promise<GetConversationMessagesResult> {
    throw new Error(
      'This version Conversation.getMessages is unsupported by the backend. Use @signalwire/client instead.'
    )
  }

  public async getChatMessages(
    _params: GetConversationChatMessageParams
  ): Promise<GetConversationChatMessageResult> {
    throw new Error(
      'This version Conversation.getChatMessages is unsupported by the backend. Use @signalwire/client instead.'
    )
  }

  public async subscribe(
    _callback: ConversationSubscribeCallback
  ): Promise<ConversationSubscribeResult> {
    throw new Error(
      'This version Conversation.subscribe is unsupported by the backend. Use @signalwire/client instead.'
    )
  }

  public async subscribeChatMessages(
    _params: ConversationChatMessagesSubscribeParams
  ): Promise<ConversationChatMessagesSubscribeResult> {
    throw new Error(
      'This version Conversation.subscribeChatMessages is unsupported by the backend. Use @signalwire/client instead.'
    )
  }

  public async joinConversation(
    params: JoinConversationParams
  ): Promise<JoinConversationResult> {
    throw new Error(
      'This version Conversation.joinConversation is unsupported by the backend. Use @signalwire/client instead.'
    )
  }
}
