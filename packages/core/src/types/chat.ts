import type {
  OnlyStateProperties,
  OnlyFunctionProperties,
  SwEvent,
  CamelToSnakeCase,
} from '..'
import type { MapToPubSubShape } from '../redux/interfaces'
import type { PubSubContract, PubSubPagingCursor } from './pubSub'
import { PRODUCT_PREFIX_CHAT } from '../utils/constants'

/** @deprecated use {@link PubSubPagingCursor} */
export type ChatCursor = PubSubPagingCursor

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

interface ChatSetMemberStateParams {
  memberId: string
  channels: ChatChannel
  state: Record<any, any>
}
interface ChatGetMemberStateParams {
  memberId: string
  channels?: ChatChannel
}
interface ChatGetMessagesParams {
  channel: string
  cursor?: PubSubPagingCursor
}
interface ChatGetMembersParams {
  channel: string
}
export interface ChatChannelState {
  state: Record<string, any> | Array<Record<string, any>>
}

export type ChatChannelName = string

export interface ChatContract extends PubSubContract {
  getMessages(params: ChatGetMessagesParams): Promise<{
    messages: ChatMessageEntity[]
    cursor: PubSubPagingCursor
  }>
  getMembers(params: ChatGetMembersParams): Promise<{
    members: ChatMemberEntity[]
  }>
  setMemberState(params: ChatSetMemberStateParams): Promise<void>
  getMemberState(params: ChatGetMemberStateParams): Promise<{
    channels: Record<ChatChannelName, ChatChannelState>
  }>
}

export type ChatEntity = OnlyStateProperties<ChatContract>
export type ChatMethods = Omit<
  OnlyFunctionProperties<ChatContract>,
  'subscribe' | 'unsubscribe' | 'updateToken'
>

export interface ChatMessageContract {
  id: string
  channel: string
  member: ChatMemberContract
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
} & { member: InternalChatMemberEntity }

export interface ChatMemberContract {
  id: string
  channel: string
  state: Record<any, any>
}

export type ChatMemberEntity = OnlyStateProperties<ChatMemberContract>

export type InternalChatMemberEntity = {
  [K in NonNullable<
    keyof ChatMemberEntity
  > as CamelToSnakeCase<K>]: ChatMemberEntity[K]
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
  | 'chat.member.set_state'
  | 'chat.member.get_state'
  | 'chat.members.get'
  | 'chat.messages.get'

export type ChatTransformType = 'chatMessage'
