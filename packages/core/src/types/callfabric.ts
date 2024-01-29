export interface PaginatedResponse<T> {
  data:
    | Array<T>
    | []
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
export interface FetchAddressResponse extends PaginatedResponse<Address>{}

export interface GetAddressesOptions {
  type?: string
  displayName?: string
}

export interface ConversationHistory {       
  type: string
  // FIXME needs to be completed
}

export interface FetchConversationHistoryResponse extends PaginatedResponse<ConversationHistory>{}

export interface GetConversationHistoriOption {
  subscriberId: string,
  addressId: string,
  limit?: number
} 