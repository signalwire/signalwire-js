import type { ConversationEventParams, UserOptions } from '@signalwire/core'
import { HTTPClient } from './HTTPClient'
import { WSClient } from './WSClient'
import { Conversation } from './Conversation'
import type { CallFabricRoomSession } from './CallFabricRoomSession'

export interface SignalWireOptions extends WSClientOptions {}

export interface SignalWireContract {
  httpHost: HTTPClient['httpHost']
  registerDevice: HTTPClient['registerDevice']
  unregisterDevice: HTTPClient['unregisterDevice']
  getSubscriberInfo: HTTPClient['getSubscriberInfo']
  connect: WSClient['connect']
  disconnect: WSClient['disconnect']
  online: WSClient['online']
  offline: WSClient['offline']
  dial: WSClient['dial']
  reattach: WSClient['reattach']
  handlePushNotification: WSClient['handlePushNotification']
  updateToken: WSClient['updateToken']
  address: {
    getAddresses: HTTPClient['getAddresses']
    getAddress: HTTPClient['getAddress']
  }
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

/**
 * WSClient
 */

export interface OnlineParams {
  incomingCallHandlers: IncomingCallHandlers
}

export interface PushNotificationPayload {
  encryption_type: 'aes_256_gcm'
  notification_uuid: string
  with_video: 'true' | 'false'
  incoming_caller_name: string
  incoming_caller_id: string
  tag: string
  invite: string
  title: string
  type: 'call_invite'
  iv: string
  version: string
  decrypted: Record<string, any>
}

export interface CallParams {
  /** HTML element in which to display the video stream */
  rootElement?: HTMLElement
  /** Disable ICE UDP transport policy */
  disableUdpIceServers?: boolean
  /** Audio constraints to use when joining the room. Default: `true`. */
  audio?: MediaStreamConstraints['audio']
  /** Video constraints to use when joining the room. Default: `true`. */
  video?: MediaStreamConstraints['video']
  /** User & UserAgent metadata */
  userVariables?: WSClientOptions['userVariables']
}

export interface DialParams extends CallParams {
  to: string
  nodeId?: string
}

export type CFUserOptions = Omit<UserOptions, 'onRefreshToken'>

export interface WSClientOptions extends CFUserOptions {
  /** HTML element in which to display the video stream */
  rootElement?: HTMLElement
  /** Call back function to receive the incoming call */
  incomingCallHandlers?: IncomingCallHandlers
  /** User & UserAgent metadata */
  userVariables?: Record<string, any>
}

/**
 * Incoming Call Manager
 */

export type InboundCallSource = 'websocket' | 'pushNotification'

export interface IncomingInvite {
  source: InboundCallSource
  callID: string
  sdp: string
  caller_id_name: string
  caller_id_number: string
  callee_id_name: string
  callee_id_number: string
  display_direction: string
  nodeId: string
}

export interface IncomingCallNotification {
  invite: {
    details: IncomingInvite
    accept: (param: CallParams) => Promise<CallFabricRoomSession>
    reject: () => Promise<void>
  }
}
export type IncomingCallHandler = (
  notification: IncomingCallNotification
) => void

export interface IncomingCallHandlers {
  all?: IncomingCallHandler
  pushNotification?: IncomingCallHandler
  websocket?: IncomingCallHandler
}

/**
 * Paginated response and result
 */

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

/**
 * Addresses
 */

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
}

export interface GetAddressesParams {
  type?: string
  displayName?: string
  pageSize?: number
}

export interface GetAddressByIdParam {
  id: string
}

export interface GetAddressBySafeNameParam {
  name: string
}

export type GetAddressParams = GetAddressByIdParam | GetAddressBySafeNameParam

export type GetAddressResult = GetAddressResponse

export type GetAddressesResponse = PaginatedResponse<GetAddressResponse>

export type GetAddressesResult = PaginatedResult<GetAddressResponse>

/**
 * Conversations
 */
export interface ConversationContract {
  readonly id: string
  readonly createdAt: number
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

export interface ConversationChatMessagesSubscribeParams {
  addressId: string
  onMessage: CoversationSubscribeCallback
}

export interface ConversationChatMessagesSubscribeResult {
  cancel: () => CoversationSubscribeCallback[]
}

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
  conversation_id: string
  user_id: string
  ts: number
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

/**
 * Subscriber info
 */
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
}

export type GetSubscriberInfoResult = GetSubscriberInfoResponse

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

export type RegisterDeviceResult = RegisterDeviceResponse

export { CallFabricRoomSession }
