import type { OnlyStateProperties, OnlyFunctionProperties, SwEvent } from '..'
import type { MapToPubSubShape } from '../redux/interfaces'
import { PRODUCT_PREFIX_CHAT } from '../utils/constants'

type ToInternalChatEvent<T extends string> = `${ChatNamespace}.${T}`
export type ChatNamespace = typeof PRODUCT_PREFIX_CHAT

export type ChatMessageEventName = 'message'
export type ChatEventNames = ChatMessageEventName

export type ChatChannel = string | string[]

export interface ChatPublishParams {
  message: any
  channel: string
  meta?: Record<any, any>
}
export interface ChatSetStateParams {
  channels: ChatChannel
  state: Record<any, any>
}
export interface ChatGetStateParams {
  channels: ChatChannel
  memberId: string
}
export interface ChatGetMessagesParams {
  channel: string
  cursor?: {
    after?: string
    before?: string
  }
}
export interface ChatGetMembersParams {
  channel: string
}
export interface ChatContract {
  subscribe(channels: ChatChannel): Promise<any>
  unsubscribe(channels: ChatChannel): Promise<any>
  publish(params: ChatPublishParams): Promise<any>
  getMessages(params: ChatGetMessagesParams): Promise<any>
  getMembers(params: ChatGetMembersParams): Promise<any>
  setState(params: ChatSetStateParams): Promise<any>
  getState(params: ChatGetStateParams): Promise<any>
}
export interface ChatMessageContract {
  id: string
  senderId: string
  channel: string
  content: any
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
  channel: string
  message: {
    id: string
    sender_id: string
    content: string
    meta?: any
    publishedAt: number
  }
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
  | 'chat.presence.set_state'
  | 'chat.presence.get_state'
  | 'chat.members.get'
  | 'chat.messages.get'

export type ChatTransformType = 'chatMessage'
