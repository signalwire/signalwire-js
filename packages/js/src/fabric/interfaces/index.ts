import { Conversation } from '../Conversation'
import { Address } from './address'
import { HTTPClientContract } from './httpClient'
import {
  WSClientContract,
  WSClientContractV4,
  WSClientOptions,
  WSClientOptionsV4,
} from './wsClient'

export interface SignalWireClientParams extends WSClientOptions {}
export interface SignalWireClientParamsV4 extends WSClientOptionsV4 {}

interface SignalWireContractBase extends Omit<HTTPClientContract, 'getAddresses' | 'getAddress'> {
  address: Pick<HTTPClientContract, 'getAddresses' | 'getAddress'>
  conversation: {
    getConversations: Conversation['getConversations']
    getMessages: Conversation['getMessages']
    getConversationMessages: Conversation['getConversationMessages']
    subscribe: Conversation['subscribe']
    sendMessage: Conversation['sendMessage']
    join: Conversation['joinConversation']
  }
  chat: {
    getMessages: Conversation['getChatMessages']
    subscribe: Conversation['subscribeChatMessages']
    sendMessage: Conversation['sendMessage']
    join: Conversation['joinConversation']
  }
}

export type SignalWireContract = SignalWireContractBase &
  WSClientContract 

export type SignalWireContractV4 = SignalWireContractBase &
  WSClientContractV4
  
export type SignalWireClient = SignalWireContract

export type SignalWireClientV4 = SignalWireContractV4

// #region Paginated response and result

export interface PaginatedResponse<T> {
  data: Array<T>
  links: {
    first?: string
    self?: string
    next?: string
    prev?: string
  }
}

export interface PaginatedResult<T> {
  data: Array<T>
  self(): Promise<PaginatedResult<T> | undefined>
  nextPage(): Promise<PaginatedResult<T> | undefined>
  prevPage(): Promise<PaginatedResult<T> | undefined>
  firstPage(): Promise<PaginatedResult<T> | undefined>
  hasNext: boolean
  hasPrev: boolean
}

// #endregion Paginated response and result

// #region Subscriber info

export interface GetSubscriberInfoResponse {
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
  fabric_addresses: Address[]
}

export type GetSubscriberInfoResult = GetSubscriberInfoResponse

// #endregion Subscriber info

export * from './capabilities'
export * from './address'
export * from './conversation'
export * from './device'
export * from './httpClient'
export * from './incomingCallManager'
export * from './wsClient'
