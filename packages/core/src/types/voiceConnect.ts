import {
  CallingCallDevice,
  MapToPubSubShape,
  OmitType,
  SwEvent,
  ToInternalVoiceEvent,
  VoiceCallPhoneParams,
  VoiceCallSipParams,
  VoiceDeviceBuilder,
  VoicePlaylist,
} from '..'

// ────────────────────────────────────────────────────────────
//  Private Event Types
// ────────────────────────────────────────────────────────────

export type CallConnect = 'call.connect'

// ────────────────────────────────────────────────────────────
//  Public Event Types (not yet exposed publicly)
// ────────────────────────────────────────────────────────────

export type CallConnectConnecting = 'connect.connecting'
export type CallConnectConnected = 'connect.connected'
export type CallConnectDisconnected = 'connect.disconnected'
export type CallConnectFailed = 'connect.failed'

export type VoiceCallConnectEventNames =
  | CallConnectConnecting
  | CallConnectConnected
  | CallConnectDisconnected
  | CallConnectFailed

// ────────────────────────────────────────────────────────────
//  Server side Events
// ────────────────────────────────────────────────────────────

export type CallingCallConnectState =
  | 'connecting'
  | 'connected'
  | 'failed'
  | 'disconnected'

export type CallingCallConnectEventParams =
  | CallingCallConnectSuccessEventParams
  | CallingCallConnectFailedEventParams

export interface CallingCallConnectSuccessEventParams {
  node_id: string
  call_id: string
  tag: string
  connect_state: 'connecting' | 'connected' | 'disconnected'
  peer: {
    node_id: string
    call_id: string
    tag: string
    device: CallingCallDevice
  }
}

export interface CallingCallConnectFailedEventParams {
  node_id: string
  call_id: string
  tag: string
  connect_state: 'failed'
  failed_reason: string
}

/**
 * 'calling.call.connect'
 */
export interface CallingCallConnectEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallConnect>
  params: CallingCallConnectEventParams
}

// ────────────────────────────────────────────────────────────
//  SDK side Events
// ────────────────────────────────────────────────────────────

/**
 * 'calling.connect.connecting'
 */
export interface VoiceCallConnectConnectingEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallConnectConnecting>
  params: CallingCallConnectEventParams
}
/**
 * 'calling.connect.connected'
 */
export interface VoiceCallConnectConnectedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallConnectConnected>
  params: CallingCallConnectEventParams
}
/**
 * 'calling.connect.disconnected'
 */
export interface VoiceCallConnectDisconnectedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallConnectDisconnected>
  params: CallingCallConnectEventParams
}
/**
 * 'calling.connect.failed'
 */
export interface VoiceCallConnectFailedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallConnectFailed>
  params: CallingCallConnectEventParams
}

// ────────────────────────────────────────────────────────────
//  Voice Connect Methods & Param Interfaces
// ────────────────────────────────────────────────────────────

export type VoiceCallConnectMethod = 'calling.connect' | 'calling.disconnect'

export interface VoiceCallConnectAdditionalParams {
  ringback?: VoicePlaylist
  maxPricePerMinute?: number
}

export type VoiceCallConnectMethodParams =
  | VoiceDeviceBuilder
  | ({
      devices: VoiceDeviceBuilder
    } & VoiceCallConnectAdditionalParams)

export type VoiceCallConnectPhoneMethodParams = OmitType<VoiceCallPhoneParams> &
  VoiceCallConnectAdditionalParams

export type VoiceCallConnectSipMethodParams = OmitType<VoiceCallSipParams> &
  VoiceCallConnectAdditionalParams

// ────────────────────────────────────────────────────────────
//  Voice CallConnect Contract, Entity, Methods
// ────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────
//  Final “Event” Exports
// ────────────────────────────────────────────────────────────

export type VoiceCallConnectEvent =
  // Server Events
  | CallingCallConnectEvent
  // SDK Events
  | VoiceCallConnectConnectingEvent
  | VoiceCallConnectConnectedEvent
  | VoiceCallConnectDisconnectedEvent
  | VoiceCallConnectFailedEvent

export type VoiceCallConnectEventParams =
  // Server Event Params
  | CallingCallConnectEventParams
  // SDK Event Params
  | VoiceCallConnectConnectingEvent['params']
  | VoiceCallConnectConnectedEvent['params']
  | VoiceCallConnectDisconnectedEvent['params']
  | VoiceCallConnectFailedEvent['params']

export type VoiceCallConnectAction = MapToPubSubShape<CallingCallConnectEvent>
