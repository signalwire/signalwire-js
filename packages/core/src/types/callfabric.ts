export interface PaginatedResponse<T> {
  data: Array<T> | []
  links: {
    first?: string
    self?: string
    next?: string
    prev?: string
  }
}

/**
 * Addresses
 */
export interface GetAddressesOptions {
  type?: string
  displayName?: string
  pageSize?: number
}

export interface Address {
  display_name: string
  name: string
  preview_url?: string
  cover_url?: string
  resource_id: string
  type: string
  channels: {
    audio?: string
    messaging?: string
    video?: string
  }
}

export interface FetchAddressResponse extends PaginatedResponse<Address> {}

/**
 * Conversations
 */
export interface GetConversationsOptions {
  limit?: number
  since?: number
  until?: number
  cursor?: string
}

export interface Conversation {
  created_at: number
  id: string
  last_message_at: number
  metadata: Record<string, any>
  name: string
}

export interface FetchConversationsResponse
  extends PaginatedResponse<Conversation> {}

/**
 * Messages
 */

export interface GetMessagesOptions {
  limit?: number
  since?: number
  until?: number
  cursor?: string
}

export interface ConversationMessage {
  id: string
  conversation_id: string
  user_id: string
  ts: number
  details: Record<string, any>
  type: string
  subtype: string
  kind: string
}

export interface FetchConversationMessagesResponse
  extends PaginatedResponse<ConversationMessage> {}

export interface GetConversationMessagesOptions {
  addressId: string
  limit?: number
  since?: number
  until?: number
  cursor?: string
}

export interface SubscriberInfoResponse {
  app_settings?: string
  company_name?: string
  country?: string
  display_name?: string
  email: string
  first_name?: string
  id: string
  job_title?: string
  last_name?: string
  push_notification_key: string
  region?: string
  time_zone?: number
}
