import { GetConversationChatMessageResult } from 'packages/client/dist/client/src'
import { Conversation } from './Conversation'
import {
  ConversationAPIGetMessagesParams,
  ConversationAPISendMessageParams,
  ConversationContract,
  ConversationResponse,
  GetConversationMessagesResult,
  PaginatedResponse,
  SendConversationMessageResponse,
} from './interfaces'

export class ConversationAPI implements ConversationContract {
  constructor(
    private conversation: Conversation,
    private payload: ConversationResponse
  ) {}

  get id() {
    return this.payload.id
  }

  get addressId() {
    return this.payload.address_id
  }

  get createdAt() {
    return this.payload.created_at
  }

  get lastMessageAt() {
    return this.payload.last_message_at
  }

  get metadata() {
    return this.payload.metadata
  }

  get name() {
    return this.payload.name
  }

  sendMessage(_params: ConversationAPISendMessageParams): Promise<SendConversationMessageResponse> {
    throw new Error(
      'This version ConversationAPI.sendMessage is unsupported by the backend. Use @signalwire/client instead.'
    )
  }

  getMessages(_params?: ConversationAPIGetMessagesParams): Promise<GetConversationMessagesResult> {
    throw new Error(
      'This version ConversationAPI.getMessages is unsupported by the backend. Use @signalwire/client instead.'
    )
  }
}
