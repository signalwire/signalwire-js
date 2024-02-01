<<<<<<< Updated upstream
export interface FetchAddressResponse {
  data:
    | Array<{
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
      }>
    | []
=======
export interface PaginatedResponse<T> {
  data: Array<T> | []
>>>>>>> Stashed changes
  links: {
    first: string
    self: string
    next?: string
    prev?: string
  }
}

<<<<<<< Updated upstream
=======
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

>>>>>>> Stashed changes
export interface GetAddressesOptions {
  type?: string
  displayName?: string
}
<<<<<<< Updated upstream
=======

export interface ConversationHistory {
  type: string
  // FIXME needs to be completed
}

export interface FetchConversationHistoryResponse
  extends PaginatedResponse<ConversationHistory> {}

export interface GetConversationHistoriOption {
  subscriberId: string
  addressId: string
  limit?: number
}
>>>>>>> Stashed changes
