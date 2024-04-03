import { Conversation } from './Conversation'
import { Conversation as ConversationType } from '@signalwire/core'

export interface ConversationAPISendMessageOptions {
  text: string
}

export interface ConversationAPIGetMessagesOptions {
  pageSize?: number
}
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

  constructor(private conversation: Conversation, private data: ConversationType) {}

  sendMessage(options: ConversationAPISendMessageOptions) {
    return this.conversation.sendMessage({
      addressId: this.id,
      text: options.text,
    })
  }
  getMessages(options: ConversationAPIGetMessagesOptions | undefined) {
    return this.conversation.getConversationMessages({ addressId: this.id, ...options })
  }
}