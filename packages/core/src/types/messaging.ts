import type { OnlyStateProperties, OnlyFunctionProperties, SwEvent } from '..'
import type { MapToPubSubShape } from '../redux/interfaces'
import { PRODUCT_PREFIX_MESSAGING } from '../utils/constants'

export type MessagingMessageState =
  | 'queued'
  | 'initiated'
  | 'sent'
  | 'delivered'
  | 'undelivered'
  | 'failed'

export type MessagingNamespace = typeof PRODUCT_PREFIX_MESSAGING

export type MessageReceivedEventName = 'message.received'
export type MessageUpdatedEventName = 'message.updated'

export type MessagingState = 'messaging.state'
export type MessagingReceive = 'messaging.receive'

export type MessagingEventNames = MessagingState | MessagingReceive

export interface MessagingContract {}

export type MessagingEntity = OnlyStateProperties<MessagingContract>
export type MessagingMethods = Omit<
  OnlyFunctionProperties<MessagingContract>,
  'subscribe' | 'unsubscribe' | 'updateToken'
>

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
export interface MessagingStateEventParams {
  message_id: string
  context: string
  direction: 'inbound' | 'outbound'
  tag?: string
  tags: string[]
  from_number: string
  to_number: string
  body: string
  media?: string[]
  segments: number
  message_state: MessagingMessageState
}

export interface MessagingStateEvent extends SwEvent {
  event_type: MessagingState
  context: string
  space_id: string
  project_id: string
  params: MessagingStateEventParams
}

/**
 * 'messaging.receive'
 */
export interface MessagingReceiveEventParams {
  message_id: string
  context: string
  direction: 'inbound' | 'outbound'
  tags: string[]
  from_number: string
  to_number: string
  body: string
  media?: string[]
  segments: number
  message_state: 'received'
}

export interface MessagingReceiveEvent extends SwEvent {
  event_type: MessagingReceive
  context: string
  space_id: string
  project_id: string
  params: MessagingReceiveEventParams
}

/**
 * Events from the SDK (just renamed for the end-users)
 */
export interface MessageUpdatedEvent
  extends Omit<MessagingStateEvent, 'event_type'> {
  event_type: 'message.updated'
}
export interface MessageReceivedEvent
  extends Omit<MessagingReceiveEvent, 'event_type'> {
  event_type: 'message.received'
}

export type MessagingEvent =
  | MessagingStateEvent
  | MessageUpdatedEvent
  | MessagingReceiveEvent
  | MessageReceivedEvent

export type MessagingEventParams =
  | MessagingStateEventParams
  | MessagingReceiveEventParams

export type MessagingAction = MapToPubSubShape<MessagingEvent>

export type MessagingJSONRPCMethod = 'messaging.send'

export type MessagingTransformType = 'messagingMessage'
