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
    private data: ConversationResponse
  ) {}

  get id() {
    return this.data.id
  }

  get createdAt() {
    return this.data.created_at
  }

  get lastMessageAt() {
    return this.data.last_message_at
  }

  get metadata() {
    return this.data.metadata
  }

  get name() {
    return this.data.name
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
