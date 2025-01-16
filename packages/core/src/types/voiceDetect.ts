import { MapToPubSubShape, SwEvent, ToInternalVoiceEvent } from '..'
import { OnlyFunctionProperties, OnlyStateProperties } from './utils'

// ────────────────────────────────────────────────────────────
//  Private Event Types
// ────────────────────────────────────────────────────────────

export type CallDetect = 'call.detect'

// ────────────────────────────────────────────────────────────
//  Public Event Types (not yet exposed publicly)
// ────────────────────────────────────────────────────────────

export type CallDetectStarted = 'detect.started'
export type CallDetectUpdated = 'detect.updated'
export type CallDetectEnded = 'detect.ended'

export type VoiceCallDetectEventNames =
  | CallDetectStarted
  | CallDetectUpdated
  | CallDetectEnded

// ────────────────────────────────────────────────────────────
//  Server side Events
// ────────────────────────────────────────────────────────────

type CallingCallDetectState = 'finished' | 'error'

/** @deprecated */
export type CallingCallDetectEndState = CallingCallDetectState

interface CallingCallDetectFax {
  type: 'fax'
  params: {
    event: 'CED' | 'CNG' | CallingCallDetectState
  }
}

interface CallingCallDetectMachine {
  type: 'machine'
  params: {
    beep: boolean
    event:
      | 'MACHINE'
      | 'HUMAN'
      | 'UNKNOWN'
      | 'READY'
      | 'NOT_READY'
      | CallingCallDetectState
  }
}

interface CallingCallDetectDigit {
  type: 'digit'
  params: {
    event:
      | '0'
      | '1'
      | '2'
      | '3'
      | '4'
      | '5'
      | '6'
      | '7'
      | '8'
      | '9'
      | '#'
      | '*'
      | CallingCallDetectState
  }
}

export type Detector =
  | CallingCallDetectFax
  | CallingCallDetectMachine
  | CallingCallDetectDigit

export type DetectorResult = Detector['params']['event']

export type CallingCallDetectType = Detector['type']

export interface CallingCallDetectEventParams {
  node_id: string
  call_id: string
  control_id: string
  detect?: Detector
  waitForBeep?: any
}

/**
 * 'calling.call.detect'
 */
export interface CallingCallDetectEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallDetect>
  params: CallingCallDetectEventParams
}

// ────────────────────────────────────────────────────────────
//  SDK side Events
// ────────────────────────────────────────────────────────────

/**
 * 'calling.detect.started'
 */
export interface VoiceCallDetectStartedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallDetectStarted>
  params: CallingCallDetectEventParams & { tag: string }
}
/**
 * 'calling.detect.updated'
 */
export interface VoiceCallDetectUpdatedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallDetectUpdated>
  params: CallingCallDetectEventParams & { tag: string }
}
/**
 * 'calling.detect.ended'
 */
export interface VoiceCallDetectEndedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallDetectEnded>
  params: CallingCallDetectEventParams & { tag: string }
}

// ────────────────────────────────────────────────────────────
//  Voice Detect Methods & Param Interfaces
// ────────────────────────────────────────────────────────────

export type VoiceCallDetectMethod = 'calling.detect' | 'calling.detect.stop'

interface VoiceCallDetectBaseParams {
  timeout?: number
  waitForBeep?: boolean // SDK-side only
}

export interface VoiceCallDetectMachineParams
  extends VoiceCallDetectBaseParams {
  type: 'machine'
  initialTimeout?: number
  endSilenceTimeout?: number
  machineReadyTimeout?: number
  machineVoiceThreshold?: number
  machineWordsThreshold?: number
  detectInterruptions?: boolean
}

export interface VoiceCallDetectFaxParams extends VoiceCallDetectBaseParams {
  type: 'fax'
  tone?: 'CED' | 'CNG'
}

export interface VoiceCallDetectDigitParams extends VoiceCallDetectBaseParams {
  type: 'digit'
  digits?: string
}

export type VoiceCallDetectMethodParams =
  | VoiceCallDetectMachineParams
  | VoiceCallDetectFaxParams
  | VoiceCallDetectDigitParams

// ────────────────────────────────────────────────────────────
//  Voice CallDetect Contract, Entity, Methods
// ────────────────────────────────────────────────────────────

export interface VoiceCallDetectContract {
  /** Unique id for this detection */
  readonly id: string
  /** @ignore */
  readonly callId: string
  /** @ignore */
  readonly controlId: string
  /** @ignore The type of this detecting session. */
  readonly type?: CallingCallDetectType
  /** @ignore The result value of the detection. */
  readonly result: DetectorResult

  stop(): Promise<this>
  /**
   * @deprecated use {@link ended} instead.
   */
  waitForResult(): Promise<this>
  ended(): Promise<this>
}

/**
 * VoiceCallDetect properties
 */
export type VoiceCallDetectEntity = OnlyStateProperties<VoiceCallDetectContract>

/**
 * VoiceCallDetect methods
 */
export type VoiceCallDetectMethods =
  OnlyFunctionProperties<VoiceCallDetectContract>

// ────────────────────────────────────────────────────────────
//  Final “Event” Exports
// ────────────────────────────────────────────────────────────

export type VoiceCallDetectEvent =
  // Server Events
  | CallingCallDetectEvent
  // SDK Events
  | VoiceCallDetectStartedEvent
  | VoiceCallDetectUpdatedEvent
  | VoiceCallDetectEndedEvent

export type VoiceCallDetectEventParams =
  // Server Event Params
  | CallingCallDetectEventParams
  // SDK Event Params
  | VoiceCallDetectStartedEvent['params']
  | VoiceCallDetectUpdatedEvent['params']
  | VoiceCallDetectEndedEvent['params']

export type VoiceCallDetectAction = MapToPubSubShape<CallingCallDetectEvent>
