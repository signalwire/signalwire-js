import { PaginatedResponse, PaginatedResult } from '.'
import type { ConversationEventParams } from '@signalwire/core'

export interface ConversationContract {
  readonly addressId: string
  readonly createdAt: number
  readonly id: string
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
  text: string
  addressId: string
  metadata?: Record<string, any>
  details?: Record<string, any>
}

export interface SendConversationMessageResponse {
  table: {
    conversation_id: string
    text: string
  }
}

export type SendConversationMessageResult = SendConversationMessageResponse

export interface GetConversationsParams {
  pageSize?: number
}

export interface ConversationResponse {
  address_id: string
  created_at: number
  id: string
  last_message_at: number
  metadata: Record<string, any>
  name: string
}

export type GetConversationsResponse = PaginatedResponse<ConversationResponse>

export type GetConversationsResult = PaginatedResult<ConversationContract>

export type CoversationSubscribeCallback = (
  event: ConversationEventParams
) => unknown

export interface CoversationSubscribeResult {
  unsubscribe: () => void
}

export interface ConversationChatMessagesSubscribeParams {
  addressId: string
  onMessage: CoversationSubscribeCallback
}

export type ConversationChatMessagesSubscribeResult = CoversationSubscribeResult

export interface JoinConversationParams {
  addressId: string
}

export interface JoinConversationResponse {
  table: {
    conversation_id: string
    text: string
  }
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
  address_id: string
  conversation_id: string
  user_id: string
  from_address_id: string
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
}

export interface GetConversationChatMessageParams {
  addressId: string
  pageSize?: number
}

export type GetConversationChatMessageResult =
  PaginatedResult<ConversationChatMessage>

export interface GetConversationMessagesResponse
  extends PaginatedResponse<ConversationMessage> {}

export interface GetConversationMessagesParams {
  addressId: string
  pageSize?: number
}

export type GetConversationMessagesResult = PaginatedResult<ConversationMessage>

/**
 * Conversation API
 */
export interface ConversationAPISendMessageParams {
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
