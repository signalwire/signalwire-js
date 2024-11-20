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
  capabilities: CallCapabilities
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
  room_session_id?: string
  origin_call_id?: string
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

type HasCallId = {
  params: { call_id: string; room_session_id?: string; origin_call_id?: String }
}
type HasRoomSessionId = {
  params: { call_id?: string; room_session_id: string; origin_call_id?: String }
}
type HasEitherCallIdOrRoomSessionId = HasCallId | HasRoomSessionId

export type CallFabricAction = MapToPubSubShape<
  CallFabricEvent & HasEitherCallIdOrRoomSessionId
>

interface OnOffCapability {
  on?: true
  off?: true
}

interface ParticipantCapability {
  muteAudio?: OnOffCapability
  muteVideo?: OnOffCapability
  microphoneVolume?: true
  microphoneSensitivity?: true
  speakerVolume?: true
  deaf?: OnOffCapability
  raisehand?: OnOffCapability
  position?: true
  meta?: true
  remove?: true 
}

export interface CallCapabilities {
  self?: ParticipantCapability,
  member?: ParticipantCapability,
  end?:true
  setLayout?: true
  sendDigit?: true
  vmutedHide?: OnOffCapability 
  lock?: OnOffCapability
  device?: true
  screenshare?: true
}

