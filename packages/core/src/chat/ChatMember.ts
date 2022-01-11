import { ChatMemberContract } from '..'

export class ChatMember implements ChatMemberContract {
  constructor(private payload: ChatMemberContract) {}

  get id(): string {
    return this.payload.id
  }

  get channel(): string {
    return this.payload.channel
  }

  get state(): any {
    return this.payload.state ?? {}
  }
}
