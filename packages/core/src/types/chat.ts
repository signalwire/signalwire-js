import type {
  OnlyStateProperties,
  OnlyFunctionProperties,
  SwEvent,
  CamelToSnakeCase,
} from '..'
import type { MapToPubSubShape } from '../redux/interfaces'
import type {
  PubSubChannel,
  PubSubContract,
  PubSubMessageEntity,
  PubSubPublishParams,
} from './pubSub'
import type { PaginationCursor } from './common'
import { PRODUCT_PREFIX_CHAT } from '../utils/constants'

/** @deprecated use {@link PaginationCursor} */
export type ChatCursor = PaginationCursor

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
  cursor?: PaginationCursor
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
    cursor: PaginationCursor
  }>
  getMembers(params: ChatGetMembersParams): Promise<{
    members: ChatMemberEntity[]
  }>
  setMemberState(params: ChatSetMemberStateParams): Promise<void>
  getMemberState(params: ChatGetMemberStateParams): Promise<{
    channels: Record<ChatChannelName, ChatChannelState>
  }>
   /**
   * List of channels for which you want to receive
   * messages.
   *
   * Note that the `subscribe` function is idempotent, and
   * calling it again with a different set of channels _will
   * not_ unsubscribe you from the old ones. To unsubscribe,
   * use {@link unsubscribe}.
   *
   * @param channels - {@link PubSubChannel} the channels to
   * subscribe to, either in the form of a string (for one
   * channel) or an array of strings.
   *
   * @example
   * ```js
   * const chatClient = new Chat.Client({
   *   project: '<project-id>',
   *   token: '<api-token>'
   * })
   *
   * chatClient.on('message', m => console.log(m))
   *
   * await chatClient.subscribe("my-channel")
   * await chatClient.subscribe(["chan-2", "chan-3"])
   * ```
   */
  subscribe(channels: PubSubChannel): Promise<void>
  /**
   * List of channels from which you want to unsubscribe.
   *
   * @param channels - {@link PubSubChannel} the channels to
   * unsubscribe from, either in the form of a string (for
   * one channel) or an array of strings.
   *
   * @example
   * ```js
   * await chatClient.unsubscribe("my-channel")
   * await chatClient.unsubscribe(["chan-2", "chan-3"])
   * ```
   */
  unsubscribe(channels: PubSubChannel): Promise<void>
  /**
   * Publish a message into the specified channel.
   *
   * @param params - {@link PubSubPublishParams}
   *
   * @example Publishing a message as a string:
   * ```js
   * await chatClient.publish({
   *   channel: 'my-channel',
   *   content: 'Hello, world.'
   * })
   * ```
   *
   * @example Publishing a message as an object:
   * ```js
   * await chatClient.publish({
   *   channel: 'my-channel',
   *   content: {
   *     field_one: 'value_one',
   *     field_two: 'value_two',
   *   }
   * })
   * ```
   */
  publish(params: PubSubPublishParams): Promise<void>
}

export type ChatEntity = OnlyStateProperties<ChatContract>
export type ChatMethods = Omit<
  OnlyFunctionProperties<ChatContract>,
  'subscribe' | 'unsubscribe' | 'updateToken'
>

export interface ChatMessageContract extends PubSubMessageEntity {
  member: ChatMemberContract
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

/**
 * Internally we're mapping/converting this event to
 * `message` so the end user can register their event
 * handlers as `client.on('message', handler)` instead of
 * `client.on('channel.message', handler)`
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

export type ChatTransformType = 'chatMessage' | 'chatMember'
