export interface PaginatedResponse<T> {
  data: Array<T> | []
  links: {
    first: string
    self: string
    next?: string
    prev?: string
  }
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

export interface GetAddressesOptions {
  type?: string
  displayName?: string
}

export interface ConversationHistory {
  type: string
  // FIXME needs to be completed
}

export interface FetchConversationHistoryResponse
  extends PaginatedResponse<ConversationHistory> {}

export interface GetConversationHistoryOption {
  subscriberId: string
  addressId: string
  limit?: number
}

export interface GetConversationsOptions {
  limit?: number
  since?: number
  until?: number
  cursor?: string
}

export interface GetConversationMessagesOptions {
  fabricAddressId?: string
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
