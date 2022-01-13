import { ChatMessageContract, ChatMemberContract } from '..'

export class ChatMessage implements ChatMessageContract {
  constructor(private payload: ChatMessageContract) {}

  get id(): string {
    return this.payload.id
  }

  get member(): ChatMemberContract {
    return this.payload.member
  }

  get channel(): string {
    return this.payload.channel
  }

  get content(): string {
    return this.payload.content
  }

  get meta(): any {
    return this.payload.meta
  }

  get publishedAt(): Date {
    return this.payload.publishedAt
  }
}
