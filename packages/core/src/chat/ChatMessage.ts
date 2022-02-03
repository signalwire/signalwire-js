import { ChatMessageContract, ChatMemberContract } from '..'

/**
 * Represents a message in a chat.
 */
export class ChatMessage implements ChatMessageContract {
  constructor(private payload: ChatMessageContract) {}

  /** The id of this message */
  get id(): string {
    return this.payload.id
  }

  /** The member which sent this message */
  get member(): ChatMemberContract {
    return this.payload.member
  }

  /** The channel in which this message was sent */
  get channel(): string {
    return this.payload.channel
  }

  /** The content of this message */
  get content(): string {
    return this.payload.content
  }

  /** Any metadata associated to this message */
  get meta(): any {
    return this.payload.meta
  }

  /** The date at which this message was published */
  get publishedAt(): Date {
    return this.payload.publishedAt
  }
}
