import { MapToPubSubShape, SwEvent, ToInternalVoiceEvent } from '..'
import { OnlyFunctionProperties, OnlyStateProperties } from './utils'

// ────────────────────────────────────────────────────────────
//  Private Event Types
// ────────────────────────────────────────────────────────────

export type CallTap = 'call.tap'

// ────────────────────────────────────────────────────────────
//  Public Event Types
// ────────────────────────────────────────────────────────────

export type CallTapStarted = 'tap.started'
export type CallTapEnded = 'tap.ended'

export type VoiceCallTapEventNames = CallTapStarted | CallTapEnded

// ────────────────────────────────────────────────────────────
//  Server side Events
// ────────────────────────────────────────────────────────────

export type CallingCallTapState = 'tapping' | 'finished'

export type CallingCallTapEndState = Exclude<CallingCallTapState, 'tapping'>

export type TapCodec = 'OPUS' | 'PCMA' | 'PCMU'

export type TapDirection = 'listen' | 'speak' | 'both'

interface CallingCallTapDeviceRTP {
  type: 'rtp'
  params: {
    addr: string
    port: number
    codec?: TapCodec
    ptime?: number
  }
}

interface CallingCallTapDeviceWS {
  type: 'ws'
  params: {
    uri: string
    codec?: TapCodec
    rate?: number
  }
}

interface CallingCallTapAudio {
  type: 'audio'
  params: {
    direction?: TapDirection
  }
}

export interface CallingCallTapEventParams {
  node_id: string
  call_id: string
  control_id: string
  state: CallingCallTapState
  tap: CallingCallTapAudio
  device: CallingCallTapDeviceRTP | CallingCallTapDeviceWS
}

/**
 * 'calling.call.tap'
 */
export interface CallingCallTapEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallTap>
  params: CallingCallTapEventParams
}

// ────────────────────────────────────────────────────────────
//  SDK side Events
// ────────────────────────────────────────────────────────────

/**
 * 'calling.tap.started'
 */
export interface VoiceCallTapStartedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallTapStarted>
  params: CallingCallTapEventParams & { tag: string }
}
/**
 * 'calling.tap.ended'
 */
export interface VoiceCallTapEndedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallTapEnded>
  params: CallingCallTapEventParams & { tag: string }
}

// ────────────────────────────────────────────────────────────
//  Voice Tap Methods & Param Interfaces
// ────────────────────────────────────────────────────────────

export type VoiceCallTapMethod = 'calling.tap' | 'calling.tap.stop'

export interface TapDeviceWS {
  type: 'ws'
  uri: string
  codec?: TapCodec
  rate?: number
}

export interface TapDeviceRTP {
  type: 'rtp'
  addr: string
  port: string
  codec?: TapCodec
  ptime?: number
}

export type TapDevice = TapDeviceWS | TapDeviceRTP

export interface VoiceCallTapMethodParams {
  device: TapDevice
  audio: {
    direction: TapDirection
  }
}

export interface VoiceCallTapAudioMethodParams {
  device: TapDevice
  direction: TapDirection
}

// ────────────────────────────────────────────────────────────
//  Voice CallTap Contract, Entity, Methods
// ────────────────────────────────────────────────────────────

export interface VoiceCallTapContract {
  /** Unique id for this tap */
  readonly id: string
  /** @ignore */
  readonly callId: string
  /** @ignore */
  readonly controlId: string
  /** @ignore */
  readonly state: CallingCallTapState

  stop(): Promise<this>
  ended(): Promise<this>
}

/**
 * VoiceCallTap properties
 */
export type VoiceCallTapEntity = OnlyStateProperties<VoiceCallTapContract>

/**
 * VoiceCallTap methods
 */
export type VoiceCallTapMethods = OnlyFunctionProperties<VoiceCallTapContract>

// ────────────────────────────────────────────────────────────
//  Final “Event” Exports
// ────────────────────────────────────────────────────────────

export type VoiceCallTapEvent =
  // Server Events
  | CallingCallTapEvent
  // SDK Events
  | VoiceCallTapStartedEvent
  | VoiceCallTapEndedEvent

export type VoiceCallTapEventParams =
  // Server Event Params
  | CallingCallTapEventParams
  // SDK Event Params
  | VoiceCallTapStartedEvent['params']
  | VoiceCallTapEndedEvent['params']

export type VoiceCallTapAction = MapToPubSubShape<CallingCallTapEvent>
