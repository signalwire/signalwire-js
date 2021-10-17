import { SwEvent, ToInternalMessageEvent } from '.'

/**
 * public message event types
 */
export type MessageReceive = 'receive'
export type MessageState = 'state'

/**
 * List of public message events
 */
export type MessageEventNames = MessageReceive | MessageState

/**
 * List of internal message events
 * @internal
 */
export type InternalMessageEventNames =
  ToInternalMessageEvent<MessageEventNames>

/**
 * List of all Message states
 */
export type MessageStates =
  | 'queued'
  | 'initiated'
  | 'sent'
  | 'delivered'
  | 'undelievered'
  | 'failed'

/**
 * List of Message direction
 */
export type MessageDirections = 'inbound' | 'outbound'
/**
 * ==========
 * ==========
 * Server-Side Events
 * ==========
 * ==========
 */

/**
 * 'messaging.state'
 */
export interface MessageStateEvent extends SwEvent {
  event_type: ToInternalMessageEvent<MessageState>
  params: MessageStateEventParams
}

export interface MessageStateEventParams extends MessageReceiveEventParams {
  reason?: string
}

/**
 * 'messaging.receive'
 */

export interface MessageReceiveEvent extends SwEvent {
  event_type: ToInternalMessageEvent<MessageReceive>
  params: MessageReceiveEventParams
}

export interface MessageReceiveEventParams {
  message_id: string
  context: string
  direction: MessageDirections
  tags?: string[]
  tag: string
  from_number: string
  to_number: string
  body?: string
  media?: string[]
  segments: number
  message_state: MessageStates
}

/**
 * Public contract for Message
 */
export interface MessageContract {
  id?: string
  context: string
  from: string
  to: string
  body?: string
  media?: string[]
  tags?: string[]
  tag: string
  segments: number
  state?: MessageStates
  direction?: MessageDirections
  reason?: string
  send(): Promise<MessageContract>
}

export type MessageEvents = MessageReceiveEvent | MessageStateEvent

export type MessageAPIEventParams = MessageEvents

export type MessageEventParams =
  | MessageReceiveEventParams
  | MessageStateEventParams
