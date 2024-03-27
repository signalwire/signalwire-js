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

export interface SendConversationMessageOptions {
  text: string
  addressId: string
  metadata?: Record<string, any>
  details?: Record<string, any>
}
export interface GetConversationsOptions {
  pageSize?: number
}

export interface Conversation {
  created_at: number
  id: string
  last_message_at: number
  metadata: Record<string, any>
  name: string
}

export interface SendConversationMessageResponse {
  table: {
    conversation_id: string
    text: string
  }
}

export interface FetchConversationsResponse
  extends PaginatedResponse<Conversation> {}

/**
 * Conversation Messages
 */

export interface GetMessagesOptions {
  pageSize?: number
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
  pageSize?: number
}

/**
 * Subsriber info
 */

export interface SubscriberInfoResponse {
  id: string
  email: string
  first_name?: string
  last_name?: string
  display_name?: string
  job_title?: string
  time_zone?: number
  country?: string
  region?: string
  company_name?: string
  push_notification_key: string
  app_settings?: {
    display_name: string
    scopes: string[]
  }
}

/**
 * Device registration
 */
export type RegisterDeviceType = 'iOS' | 'Android' | 'Desktop'

export interface RegisterDeviceParams {
  deviceType: RegisterDeviceType
  deviceToken: string
}

export interface UnregisterDeviceParams {
  id: string
}

export interface RegisterDeviceResponse {
  date_registered: Date
  device_name?: string
  device_token: string
  device_type: RegisterDeviceType
  id: string
  push_notification_key: string
}
