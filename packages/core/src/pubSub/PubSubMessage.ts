import { PubSubMessageContract } from '..'

/**
 * Represents a message in a chat.
 */
export class PubSubMessage implements PubSubMessageContract {
  constructor(private payload: PubSubMessageContract) {}

  /** The id of this message */
  get id(): string {
    return this.payload.id
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
