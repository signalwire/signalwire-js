import { OnlyStateProperties, OnlyFunctionProperties, SwEvent } from '..'
import { MapToPubSubShape } from '../redux/interfaces'
import { PRODUCT_PREFIX_CHAT } from '../utils/constants'

export type ChatNamespace = typeof PRODUCT_PREFIX_CHAT
type ToInternalChatEvent<T extends string> = `${ChatNamespace}.${T}`

type ChannelMessage = 'channel.message'

export type ChatApiEventsHandlerMapping = Record<
  'message',
  (message: any) => void
>

export type ChatApiEvents = {
  [k in keyof ChatApiEventsHandlerMapping]: ChatApiEventsHandlerMapping[k]
}

export interface ChatPublishParams {
  message: any
  channel: string
  meta?: any
}
export interface ChatContract {
  subscribe(channels: string[]): any
  publish(params: ChatPublishParams): any
}

export interface ChatMessageContract {
  id: string
  senderId: string
  channel: string
  message: any
  timestamp: number
  meta?: any
}

export type ChatEntity = OnlyStateProperties<ChatContract>
export type ChatMethods = Omit<
  OnlyFunctionProperties<ChatContract>,
  'subscribe'
>

export interface InternalChatChannel {
  name: string
}

/**
 * ==========
 * ==========
 * Server-Side Events
 * ==========
 * ==========
 */

/**
 * 'chat.channel.message'
 */
export interface ChatChannelMessageEventParams {
  id: string
  sender_id: string
  message: string
  channel: string
  meta?: any
  timestamp: number
}

export interface ChatChannelMessageEvent extends SwEvent {
  event_type: ToInternalChatEvent<ChannelMessage>
  params: ChatChannelMessageEventParams
}

export type ChatEvent = ChatChannelMessageEvent

export type ChatEventParams = ChatChannelMessageEventParams

export type ChatAction = MapToPubSubShape<ChatEvent>
