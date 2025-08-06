import { PaginatedResponse, PaginatedResult } from '.'
import type {
  ConversationEventParams,
  ConversationChatEventParams,
} from '@signalwire/core'

export interface ConversationContract {
  readonly createdAt: number
  readonly groupId: string
  readonly lastMessageAt: number
  readonly metadata: Record<string, any>
  readonly name: string
  sendMessage(
    params: ConversationAPISendMessageParams
  ): Promise<SendConversationMessageResult>
  getMessages(
    params?: ConversationAPIGetMessagesParams
  ): Promise<GetConversationMessagesResult>
}

export interface SendConversationMessageParams {
  groupId: string
  fromAddressId: string
  text: string
  metadata?: Record<string, any>
  details?: Record<string, any>
}

// TODO
export type SendConversationMessageResponse = {
  group_id: string
  text: string
  from_fabric_address_id: string
}

export type SendConversationMessageResult = SendConversationMessageResponse

export interface GetConversationsParams {
  pageSize?: number
}

export interface ConversationResponse {
  group_id: string
  created_at: number
  from_address_id: string
  last_message_at: number
  metadata: Record<string, any>
  name: string
}

export type GetConversationsResponse = PaginatedResponse<ConversationResponse>

export type GetConversationsResult = PaginatedResult<ConversationContract>

export type ConversationSubscribeCallback = (
  event: ConversationEventParams
) => unknown

export type ConversationChatSubscribeCallback = (
  event: ConversationChatEventParams
) => unknown

export interface ConversationSubscribeResult {
  unsubscribe: () => void
}

export interface ConversationChatMessagesSubscribeParams {
  addressId: string
  onMessage: ConversationChatSubscribeCallback
}

export type ConversationChatMessagesSubscribeResult =
  ConversationSubscribeResult

export interface JoinConversationParams {
  addressIds: string[]
  fromAddressId: string
}

export interface JoinConversationResponse {
  group_id: string
  addressIds: string[]
  from_address_id: string
}

export type JoinConversationResult = JoinConversationResponse

/**
 * Conversation Messages
 */
export interface GetMessagesParams {
  pageSize?: number
}

export interface ConversationMessage {
  id: string
  from_address_id: string
  group_id: string
  ts: number
  metadata?: Record<string, any>
  details: Record<string, any>
  type: string
  subtype: string
  kind?: string
  text?: string
}

export type GetMessagesResult = PaginatedResult<ConversationMessage>

export type ConversationChatMessage = Omit<ConversationMessage, 'kind'> & {
  text: string
  user_name: string
}

export interface GetConversationChatMessageParams {
  groupId: string
  pageSize?: number
}

export type GetConversationChatMessageResult =
  PaginatedResult<ConversationChatMessage>

export interface GetConversationMessagesResponse
  extends PaginatedResponse<ConversationMessage> {}

export interface GetConversationMessagesParams {
  groupId: string
  pageSize?: number
}

export type GetConversationMessagesResult = PaginatedResult<ConversationMessage>

/**
 * Conversation API
 */
export interface ConversationAPISendMessageParams {
  fromAddressId: string
  text: string
}

export interface ConversationAPIGetMessagesParams {
  pageSize?: number
}

export type {
  ConversationMessageEventName,
  ConversationMessageEventParams,
  ConversationMessageEvent,
  ConversationEvent,
  ConversationEventParams,
} from '@signalwire/core'
