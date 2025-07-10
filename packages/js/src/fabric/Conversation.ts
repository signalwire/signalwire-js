import { type ConversationEventParams } from '@signalwire/core'
import { HTTPClient } from './HTTPClient'
import { WSClient } from './WSClient'
import type {
  GetMessagesParams,
  GetConversationsParams,
  GetConversationMessagesParams,
  SendConversationMessageParams,
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
} from './interfaces'
import { conversationWorker } from './workers'

interface ConversationOptions {
  httpClient: HTTPClient
  wsClient: WSClient
}

// TODO: Implement a TS contract
export class Conversation {
  private wsClient: WSClient
  private callbacks = new Set<ConversationSubscribeCallback>()
  private chatSubscriptions: Record<
    string,
    Set<ConversationSubscribeCallback>
  > = {}

  constructor(options: ConversationOptions) {
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
    _params?: GetMessagesParams
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
    _params: JoinConversationParams
  ): Promise<JoinConversationResult> {
    throw new Error(
      'This version Conversation.joinConversation is unsupported by the backend. Use @signalwire/client instead.'
    )
  }
}
