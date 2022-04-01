import { MessagingMessageState } from '@signalwire/core'

/** @internal */
export interface MessageContract {
  id: string
  state: MessagingMessageState
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
  message_state: MessagingMessageState
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

/**
 * An object representing an SMS or MMS message.
 */
export class Message implements MessageContract {
  /** The unique identifier of the message. */
  public id: string
  /** The current state of the message. */
  public state: MessagingMessageState
  /** The context of the message. */
  public context: string
  /** The phone number the message comes from. */
  public from: string
  /** The destination number of the message. */
  public to: string
  /** Body of the message */
  public body: string
  /** The direction of the message: `inbound` or `outbound`. */
  public direction: 'inbound' | 'outbound'
  /** Array of URLs media. */
  public media: string[]
  /** Number of segments of the message. */
  public segments: number
  /** Array of strings with message tags. */
  public tags: string[]
  /** Reason why the message was not sent. This is present only in case of failure. */
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
