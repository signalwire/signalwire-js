import { PaginatedResponse, PaginatedResult } from '.'

export type ResourceType = 'app' | 'call' | 'room' | 'subscriber'

export interface GetAddressResponse {
  id: string
  display_name: string
  name: string
  preview_url?: string
  cover_url?: string
  resource_id: string
  type: ResourceType
  channels: {
    audio?: string
    messaging?: string
    video?: string
  }
  locked: boolean
  created_at: string
}

export type Address = GetAddressResponse

export interface GetAddressesParams {
  type?: string
  displayName?: string
  pageSize?: number
  sortBy?: 'name' | 'created_at'
  sortOrder?: 'asc' | 'desc'
}

export interface GetAddressByIdParams {
  id: string
}

export interface GetAddressByNameParams {
  name: string
}

export type GetAddressParams = GetAddressByIdParams | GetAddressByNameParams

export type GetAddressResult = GetAddressResponse

export type GetAddressesResponse = PaginatedResponse<GetAddressResponse>

export type GetAddressesResult = PaginatedResult<GetAddressResponse>
