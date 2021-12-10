import type { OnlyStateProperties, OnlyFunctionProperties, SwEvent } from '..'
import type { MapToPubSubShape } from '../redux/interfaces'
import { PRODUCT_PREFIX_CHAT } from '../utils/constants'

type ToInternalChatEvent<T extends string> = `${ChatNamespace}.${T}`
export type ChatNamespace = typeof PRODUCT_PREFIX_CHAT

export type ChatMessageEventName = 'message'
export type ChatEventNames = ChatMessageEventName

export interface ChatPublishParams {
  message: any
  channel: string
  meta?: any
}
export interface ChatContract {
  subscribe(channels: string[]): any
  unsubscribe(channels: string[]): any
  publish(params: ChatPublishParams): any
}
export interface ChatMessageContract {
  id: string
  senderId: string
  channel: string
  message: any
  publishedAt: Date
  meta?: any
}

export type ChatEntity = OnlyStateProperties<ChatContract>
export type ChatMethods = Omit<
  OnlyFunctionProperties<ChatContract>,
  'subscribe' | 'unsubscribe'
>

/**
 * ==========
 * ==========
 * Server-Side Events
 * ==========
 * ==========
 */

type ChannelMessageEventName = 'channel.message'

/**
 * 'chat.channel.message'
 */
export interface ChatChannelMessageEventParams {
  id: string
  sender_id: string
  message: string
  channel: string
  meta?: any
  publishedAt: number
}

export interface ChatChannelMessageEvent extends SwEvent {
  event_type: ToInternalChatEvent<ChannelMessageEventName>
  params: ChatChannelMessageEventParams
}

export type ChatEvent = ChatChannelMessageEvent

export type ChatEventParams = ChatChannelMessageEventParams

export type ChatAction = MapToPubSubShape<ChatEvent>

export interface InternalChatChannel {
  name: string
}

export type ChatJSONRPCMethod =
  | 'chat.subscribe'
  | 'chat.publish'
  | 'chat.unsubscribe'

export type ChatTransformType = 'chatMessage'
