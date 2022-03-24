import type { OnlyStateProperties, OnlyFunctionProperties, SwEvent } from '..'
import type { MapToPubSubShape } from '../redux/interfaces'
import { PRODUCT_PREFIX_MESSAGING } from '../utils/constants'

// type ToInternalChatEvent<T extends string> = `${MessagingNamespace}.${T}`
export type MessagingNamespace = typeof PRODUCT_PREFIX_MESSAGING

// export type ChatMessageEventName = 'message'
// export type ChatMemberJoinedEventName = 'member.joined'
// export type ChatMemberUpdatedEventName = 'member.updated'
// export type ChatMemberLeftEventName = 'member.left'
// export type ChatMemberEventNames =
//   | ChatMemberJoinedEventName
//   | ChatMemberUpdatedEventName
//   | ChatMemberLeftEventName

// export type ChatEventNames = ChatMessageEventName | ChatMemberEventNames

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
export interface MessagingStateEventParams {}

export interface MessagingStateEvent extends SwEvent {
  event_type: 'messaging.state'
  params: MessagingStateEventParams
}

/**
 * 'messaging.receive'
 */
export interface MessagingReceiveEventParams {}

export interface MessagingReceiveEvent extends SwEvent {
  event_type: 'messaging.receive'
  params: MessagingReceiveEventParams
}

export type MessagingEvent = MessagingStateEvent | MessagingReceiveEvent

export type MessagingEventParams =
  | MessagingStateEventParams
  | MessagingReceiveEventParams

export type MessagingAction = MapToPubSubShape<MessagingEvent>

export type MessagingJSONRPCMethod = 'messaging.send'

export type MessagingTransformType = 'messagingMessage'
