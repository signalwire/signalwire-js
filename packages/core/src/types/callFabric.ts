// TODO: Should be changed to "Fabric" rather than "CallFabric"

import {
  CallState,
  CallConnect,
  CallPlay,
  InternalVideoRoomSessionEntity,
  MapToPubSubShape,
  SwEvent,
  CallEnded,
  CallRecord,
  InternalCallFabricRoomSessionEntity,
  CallFabricMemberEvent,
  CallFabricMemberEventParams,
  CallFabricLayoutEvent,
  CallFabricLayoutEventParams,
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
  call_id: string
  capabilities: string[]
  member_id: string
  node_id: string
  origin_call_id: string
  room_id: string
  room_session: InternalCallFabricRoomSessionEntity
  room_session_id: string
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
  | CallFabricMemberEvent
  | CallFabricLayoutEvent

export type CallFabricEventParams =
  | CallJoinedEventParams
  | CallStartedEventParams
  | CallUpdatedEventParams
  | CallEndedEventParams
  | CallLeftEventParams
  | CallStateEventParams
  | CallPlayEventParams
  | CallRecordEventParams
  | CallStreamEventParams
  | CallConnectEventParams
  | CallFabricMemberEventParams
  | CallFabricLayoutEventParams

export type CallFabricAction = MapToPubSubShape<CallFabricEvent>

interface CapabilityOnOffState {
  on?: true
  off?: true
}

interface MemberCapability {
  muteAudio?: CapabilityOnOffState
  muteVideo?: CapabilityOnOffState
  microphoneVolume?: true
  microphoneSensitivity?: true
  speakerVolume?: true
  deaf?: CapabilityOnOffState
  raisehand?: CapabilityOnOffState
  position?: true
  meta?: true
  remove?: true
}

export interface CallCapabilities {
  self?: MemberCapability
  member?: MemberCapability
  end?: true
  setLayout?: true
  sendDigit?: true
  vmutedHide?: CapabilityOnOffState
  lock?: CapabilityOnOffState
  device?: true
  screenshare?: true
}
