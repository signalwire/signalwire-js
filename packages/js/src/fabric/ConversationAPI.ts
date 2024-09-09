import { Conversation } from './Conversation'
import {
  ConversationAPIGetMessagesParams,
  ConversationAPISendMessageParams,
  ConversationContract,
  ConversationResponse,
} from './types'

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

  sendMessage(params: ConversationAPISendMessageParams) {
    return this.conversation.sendMessage({
      addressId: this.id,
      text: params.text,
    })
  }

  getMessages(params?: ConversationAPIGetMessagesParams) {
    return this.conversation.getConversationMessages({
      addressId: this.id,
      ...params,
    })
  }
}
