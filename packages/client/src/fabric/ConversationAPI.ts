import { Conversation } from './Conversation'
import {
  ConversationAPIGetMessagesParams,
  ConversationAPISendMessageParams,
  ConversationContract,
  ConversationResponse,
} from './interfaces'

export class ConversationAPI implements ConversationContract {
  constructor(
    private conversation: Conversation,
    private payload: ConversationResponse
  ) {}

  get id() {
    return this.payload.id
  }

  get group_id() {
    return this.payload.group_id
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
      group_id: this.group_id,
      from_address_id: params.from_address_id,
      text: params.text,
    })
  }

  getMessages(params?: ConversationAPIGetMessagesParams) {
    return this.conversation.getConversationMessages({
      group_id: this.group_id,
      ...params,
    })
  }
}
