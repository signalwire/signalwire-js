import { Conversation } from './Conversation'
import {
  ConversationAPIGetMessagesParams,
  ConversationAPISendMessageParams,
  ConversationResponse,
} from './types'

export class ConversationAPI {
  get id() {
    return this.data.id
  }

  get created_at() {
    return this.data.created_at
  }

  get last_message_at() {
    return this.data.last_message_at
  }

  get metadata() {
    return this.data.metadata
  }

  get name() {
    return this.data.name
  }

  constructor(
    private conversation: Conversation,
    private data: ConversationResponse
  ) {}

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