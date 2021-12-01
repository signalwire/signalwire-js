import { OnlyStateProperties, OnlyFunctionProperties, SwEvent } from '..'
import { MapToPubSubShape } from '../redux/interfaces'

export type ChatNamespace = 'chat'
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

export type ChatEntity = OnlyStateProperties<ChatContract>
export type ChatMethods = Omit<
  OnlyFunctionProperties<ChatContract>,
  'subscribe'
>

export interface ChatServerChannel {
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
  message: string
  channel: string
}

export interface ChatChannelMessageEvent extends SwEvent {
  event_type: ToInternalChatEvent<ChannelMessage>
  params: ChatChannelMessageEventParams
}

export type ChatEvent = ChatChannelMessageEvent

export type ChatEventParams = ChatChannelMessageEventParams

export type ChatAction = MapToPubSubShape<ChatEvent>
