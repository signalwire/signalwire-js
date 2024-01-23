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
  links: {
    first: string
    self: string
    next?: string
    prev?: string
  }
}

export interface GetAddressesOptions {
  type?: string
  displayName?: string
}
