import { ChatMessageContract } from '..'

export class BaseChatMessage implements ChatMessageContract {
  constructor(public payload: ChatMessageContract) {}

  get id(): string {
    return this.payload.id
  }

  get senderId(): string {
    return this.payload.senderId
  }

  get channel(): string {
    return this.payload.channel
  }

  get message(): string {
    return this.payload.message
  }

  get meta(): any {
    return this.payload.meta
  }

  get timestamp(): number {
    return this.payload.timestamp
  }
}
