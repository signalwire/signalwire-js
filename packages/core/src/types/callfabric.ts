import {
  CallState,
  CallConnect,
  CallPlay,
  InternalVideoRoomSessionEntity,
  MapToPubSubShape,
  SwEvent,
  CallEnded,
  CallRecord,
  ToInternalVideoEvent,
  VideoMemberEvent,
  VideoLayoutEvent,
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

export interface PaginatedResult<T> {
  data: Array<T> | []
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

export interface Address {
  id: string
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

export interface GetAddressesOptions {
  type?: string
  displayName?: string
  pageSize?: number
}

export interface GetAddressOptions {
  id: string
}

export interface GetAddressResponse extends Address {}

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
  sendMessage(options: {
    text: string
  }): Promise<SendConversationMessageResponse>
  getMessages(options: {
    pageSize?: number
  }): Promise<PaginatedResult<ConversationMessage>>
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

export type CallJoined = 'call.joined'
export type CallStarted = 'call.started'
export type CallUpdated = 'call.updated'
export type CallLeft = 'call.left'
export type CallStream = 'call.stream'

export type CallStates = 'created' | 'ringing' | 'answered' | 'ending' | 'ended'
export type CallConnectStates = 'connecting' | 'connected'
export type CallDirections = 'inbound' | 'outbound'
export type CallDeviceTypes = 'webrtc' | 'sip' | 'phone'
export type CallPlayState = 'playing' | 'paused' | 'finished'
export type CallRecordState = 'recording' | 'paused' | 'finished'
export type CallStreamState = 'streaming' | 'completed'

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

/**
 * Call Joined - call.joined
 */
export interface CallJoinedEventParams {
  room_id: string
  room_session_id: string
  call_id: string
  member_id: string
  node_id: string
  room_session: InternalVideoRoomSessionEntity
}

export interface CallJoinedEvent extends SwEvent {
  event_type: CallJoined
  params: CallJoinedEventParams
}

/**
 * Call State - call.state
 */
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

/**
 * Call Started - call.started
 */
export interface CallStartedEventParams {
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

export interface CallStartedEvent extends SwEvent {
  event_type: CallStarted
  params: CallStartedEventParams
}

/**
 * Call Updated - call.updated
 */
export interface CallUpdatedEventParams {
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

export interface CallUpdatedEvent extends SwEvent {
  event_type: CallUpdated
  params: CallUpdatedEventParams
}

/**
 * Call Ended - call.ended
 */
export interface CallEndedEventParams {
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

export interface CallEndedEvent extends SwEvent {
  event_type: CallEnded
  params: CallEndedEventParams
}

/**
 * Call Left - call.left
 */
export interface CallLeftEventParams {
  room_id: string
  room_session_id: string
  call_id: string
  member_id: string
  node_id: string
  room_session: InternalVideoRoomSessionEntity
}

export interface CallLeftEvent extends SwEvent {
  event_type: CallLeft
  params: CallLeftEventParams
}

/**
 * Call Play - call.play
 */
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

/**
 * Call Record - call.record
 */
export interface CallRecordEventParams {
  control_id: string
  call_id: string
  node_id: string
  state: CallRecordState
}

export interface CallRecordEvent extends SwEvent {
  event_type: CallRecord
  params: CallRecordEventParams
}

/**
 * Call Stream - call.stream
 */
export interface CallStreamEventParams {
  control_id: string
  call_id: string
  node_id: string
  state: CallStreamState
}

export interface CallStreamEvent extends SwEvent {
  event_type: CallStream
  params: CallStreamEventParams
}

/**
 * Call Connect - call.connect
 */
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

// Undo the ToInternalVideoEvent<T> transformation
type UndoToInternalVideoEvent<T> = T extends ToInternalVideoEvent<infer U>
  ? U
  : T

type AdjustEventType<T> = T extends { event_type: infer ET; params: infer P }
  ? { event_type: UndoToInternalVideoEvent<ET>; params: P }
  : T

export type CFMemberEvent = AdjustEventType<VideoMemberEvent>

export type CFLayoutEvent = AdjustEventType<VideoLayoutEvent>

export type CallFabricEvent =
  | CallJoinedEvent
  | CallStartedEvent
  | CallUpdatedEvent
  | CallEndedEvent
  | CallLeftEvent
  | CallStateEvent
  | CallPlayEvent
  | CallRecordEvent
  | CallStreamEvent
  | CallConnectEvent
  | CFMemberEvent
  | CFLayoutEvent

export type CallFabricAction = MapToPubSubShape<CallFabricEvent>
