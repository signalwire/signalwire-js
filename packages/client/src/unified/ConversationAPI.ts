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

  get groupId() {
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

  get fromAddressId() {
    return this.payload.from_fabric_address_id
  }

  sendMessage(params: ConversationAPISendMessageParams) {
    return this.conversation.sendMessage({
      groupId: this.groupId,
      ...params,
    })
  }

  getMessages(params?: ConversationAPIGetMessagesParams) {
    return this.conversation.getConversationMessages({
      groupId: this.groupId,
      ...params,
    })
  }
}
