interface SendResultOptions {
  code: string
  message: string
  message_id: string
}

export class SendResult {
  public successful: boolean
  public messageId: string
  public errors: string[] = []

  constructor(protected options: SendResultOptions) {
    this.successful = options?.code === '200'
    this.messageId = options.message_id
  }
}
