import {
  CallState,
  CallConnect,
  CallPlay,
  InternalVideoRoomSessionEntity,
  MapToPubSubShape,
  SwEvent,
} from '..'

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
  pageSize?: number
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

export type CallJoined = 'call.joined'

export type CallStates = 'created' | 'ringing' | 'answered' | 'finished'
export type CallConnectStates = 'connecting' | 'connected'
export type CallDirections = 'inbound' | 'outbound'
export type CallDeviceTypes = 'webrtc' | 'sip' | 'phone'
export type CallPlayState = 'playing' | 'finished'

interface CallDeviceCommonParams {
  headers?: any[]
}

export interface CallDeviceWebRTCOrSIPParams extends CallDeviceCommonParams {
  from: string
  to: string
}

export interface CallDevicePhoneParams extends CallDeviceCommonParams {
  from_number: string
  to_number: string
}

export interface CallDeviceWebRTCOrSIP {
  type: 'webrtc' | 'sip'
  params: CallDeviceWebRTCOrSIPParams
}

export interface CallDevicePhone {
  type: 'phone'
  params: CallDevicePhoneParams
}

export type CallDevice = CallDeviceWebRTCOrSIP | CallDevicePhone

export interface CallJoinedEventParams {
  room_id: string
  room_session_id: string
  call_id: string
  member_id: string
  room_session: InternalVideoRoomSessionEntity
}

export interface CallJoinedEvent extends SwEvent {
  event_type: CallJoined
  params: CallJoinedEventParams
}

export interface CallStateEventParams {
  call_id: string
  node_id: string
  segment_id: string
  call_state: CallStates
  direction: CallDirections
  device: CallDevice
  start_time: number
  answer_time: number
  end_time: number
}

export interface CallStateEvent extends SwEvent {
  event_type: CallState
  params: CallStateEventParams
}

export interface CallPlayEventParams {
  control_id: string
  call_id: string
  node_id: string
  state: CallPlayState
}

export interface CallPlayEvent extends SwEvent {
  event_type: CallPlay
  params: CallPlayEventParams
}

export interface CallConnectEventParams {
  connect_state: CallConnectStates
  peer?: {
    call_id: string
    node_id: string
    device: CallDevice
  }
  call_id: string
  node_id: string
  segment_id: string
}

export interface CallConnectEvent extends SwEvent {
  event_type: CallConnect
  params: CallConnectEventParams
}

export type CallFabricAPIEventParams =
  | CallJoinedEvent
  | CallStateEvent
  | CallPlayEvent
  | CallConnectEvent

export type CallFabricAction = MapToPubSubShape<CallFabricAPIEventParams>
