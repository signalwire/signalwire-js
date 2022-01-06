import type {
  OnlyStateProperties,
  OnlyFunctionProperties,
  SwEvent,
  CamelToSnakeCase,
} from '..'
import type { MapToPubSubShape } from '../redux/interfaces'
import { PRODUCT_PREFIX_CHAT } from '../utils/constants'

type ToInternalChatEvent<T extends string> = `${ChatNamespace}.${T}`
export type ChatNamespace = typeof PRODUCT_PREFIX_CHAT

export type ChatMessageEventName = 'message'
export type ChatMemberJoinedEventName = 'member.joined'
export type ChatMemberUpdatedEventName = 'member.updated'
export type ChatMemberLeftEventName = 'member.left'
export type ChatMemberEventNames =
  | ChatMemberJoinedEventName
  | ChatMemberUpdatedEventName
  | ChatMemberLeftEventName

export type ChatEventNames = ChatMessageEventName | ChatMemberEventNames

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

export type ChatEntity = OnlyStateProperties<ChatContract>
export type ChatMethods = Omit<
  OnlyFunctionProperties<ChatContract>,
  'subscribe' | 'unsubscribe'
>

export interface ChatMessageContract {
  id: string
  senderId: string
  channel: string
  content: any
  publishedAt: Date
  meta?: any
}
export type ChatMessageEntity = Omit<
  OnlyStateProperties<ChatMessageContract>,
  'channel'
>
export type InternalChatMessageEntity = {
  [K in NonNullable<
    keyof ChatMessageEntity
  > as CamelToSnakeCase<K>]: ChatMessageEntity[K]
}

export interface ChatMemberContract {
  id: string
  channel: string
  state?: Record<any, any>
}

// Not using OnlyStateProperties because Member for now is just an id..
export interface InternalChatMemberEntity {
  id: string
}

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
  message: InternalChatMessageEntity
}

export interface ChatChannelMessageEvent extends SwEvent {
  event_type: ToInternalChatEvent<ChannelMessageEventName>
  params: ChatChannelMessageEventParams
}

/**
 * 'chat.member.joined'
 */
export interface ChatMemberJoinedEventParams {
  channel: string
  member: InternalChatMemberEntity
}

export interface ChatMemberJoinedEvent extends SwEvent {
  event_type: ToInternalChatEvent<ChatMemberJoinedEventName>
  params: ChatMemberJoinedEventParams
}

/**
 * 'chat.member.updated'
 */
export interface ChatMemberUpdatedEventParams {
  channel: string
  member: InternalChatMemberEntity
  state: Record<any, any>
}

export interface ChatMemberUpdatedEvent extends SwEvent {
  event_type: ToInternalChatEvent<ChatMemberUpdatedEventName>
  params: ChatMemberUpdatedEventParams
}

/**
 * 'chat.member.left'
 */
export interface ChatMemberLeftEventParams {
  channel: string
  member: InternalChatMemberEntity
}

export interface ChatMemberLeftEvent extends SwEvent {
  event_type: ToInternalChatEvent<ChatMemberLeftEventName>
  params: ChatMemberLeftEventParams
}

export type ChatEvent =
  | ChatChannelMessageEvent
  | ChatMemberJoinedEvent
  | ChatMemberUpdatedEvent
  | ChatMemberLeftEvent

export type ChatEventParams =
  | ChatChannelMessageEventParams
  | ChatMemberJoinedEventParams
  | ChatMemberUpdatedEventParams
  | ChatMemberLeftEventParams

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
