export interface MessageContract {
  id: string
  state: string
  context: string
  from: string
  to: string
  direction: string
  tags: string[]
  body: string
  media: string[]
  segments: number
}

interface MessageOptions {
  message_id: string
  message_state: string
  context: string
  from_number: string
  to_number: string
  direction: 'inbound' | 'outbound'
  tags: string[]
  body: string
  media: string[]
  segments: number
  reason?: string
}

export class Message implements MessageContract {
  public id: string
  public state: string
  public context: string
  public from: string
  public to: string
  public body: string
  public direction: 'inbound' | 'outbound'
  public media: string[]
  public segments: number
  public tags: string[]
  public reason?: string

  constructor(options: MessageOptions) {
    this.id = options.message_id
    this.state = options.message_state
    this.context = options.context
    this.from = options.from_number
    this.to = options.to_number
    this.body = options.body
    this.direction = options.direction
    this.media = options.media || []
    this.segments = options.segments
    this.tags = options.tags || []
    this.reason = options.reason
  }
}
