import {
  CallRecord,
  RecordingEnded,
  RecordingFailed,
  RecordingStarted,
  RecordingUpdated,
  OnlyFunctionProperties,
  OnlyStateProperties,
  SwEvent,
  ToInternalVoiceEvent,
  MapToPubSubShape,
} from '..'

// ────────────────────────────────────────────────────────────
//  Private Event Types
// ────────────────────────────────────────────────────────────

// Defined in common.ts since other SDKs also use these types

// ────────────────────────────────────────────────────────────
//  Public Event Types
// ────────────────────────────────────────────────────────────

// Defined in common.ts since other SDKs also use these types

export type VoiceCallRecordingEventNames =
  | RecordingStarted
  | RecordingUpdated
  | RecordingEnded
  | RecordingFailed

// ────────────────────────────────────────────────────────────
//  Server side Events
// ────────────────────────────────────────────────────────────

export type CallingCallRecordState =
  | 'recording'
  | 'paused'
  | 'no_input'
  | 'finished'

export type CallingCallRecordEndState = Exclude<
  CallingCallRecordState,
  'recording' | 'paused'
>

export interface CallingCallRecordEventParams {
  node_id: string
  call_id: string
  control_id: string
  state: CallingCallRecordState
  url?: string
  duration?: number
  size?: number
  record: any // FIXME:
}

/**
 * 'calling.call.record'
 */
export interface CallingCallRecordEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallRecord>
  params: CallingCallRecordEventParams
}

// ────────────────────────────────────────────────────────────
//  SDK side Events
// ────────────────────────────────────────────────────────────

/**
 * 'calling.recording.started'
 */
export interface VoiceCallRecordingStartedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<RecordingStarted>
  params: CallingCallRecordEventParams & { tag: string }
}
/**
 * 'calling.recording.updated'
 */
export interface VoiceCallRecordingUpdatedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<RecordingUpdated>
  params: CallingCallRecordEventParams & { tag: string }
}
/**
 * 'calling.recording.ended'
 */
export interface VoiceCallRecordingEndedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<RecordingEnded>
  params: CallingCallRecordEventParams & { tag: string }
}
/**
 * 'calling.recording.failed'
 */
export interface VoiceCallRecordingFailedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<RecordingFailed>
  params: CallingCallRecordEventParams & { tag: string }
}

// ────────────────────────────────────────────────────────────
//  Voice Recording Methods & Param Interfaces
// ────────────────────────────────────────────────────────────

export type VoiceCallRecordMethod =
  | 'calling.record'
  | 'calling.record.pause'
  | 'calling.record.resume'
  | 'calling.record.stop'

export interface CallingCallRecordPauseMethodParams {
  behavior?: 'silence' | 'skip'
}

export interface VoiceCallRecordMethodParams {
  audio: {
    beep?: boolean
    format?: 'mp3' | 'wav'
    stereo?: boolean
    direction?: 'listen' | 'speak' | 'both'
    initialTimeout?: number
    endSilenceTimeout?: number
    terminators?: string
    inputSensitivity?: number
  }
}

// ────────────────────────────────────────────────────────────
//  Voice CallRecording Contract, Entity, Methods
// ────────────────────────────────────────────────────────────

export interface VoiceCallRecordingContract {
  /** Unique id for this recording */
  readonly id: string
  /** @ignore */
  readonly callId: string
  /** @ignore */
  readonly controlId: string
  /** @ignore */
  readonly state: CallingCallRecordState | undefined
  /** @ignore */
  readonly url: string | undefined
  /** @ignore */
  readonly size: number | undefined
  /** @ignore */
  readonly duration: number | undefined
  /** @ignore */
  readonly record: CallingCallRecordEventParams['record'] | undefined

  pause(params?: CallingCallRecordPauseMethodParams): Promise<this>
  resume(): Promise<this>
  stop(): Promise<this>
  ended(): Promise<this>
}

/**
 * VoiceCallRecording properties
 */
export type VoiceCallRecordingEntity =
  OnlyStateProperties<VoiceCallRecordingContract>

/**
 * VoiceCallRecording methods
 */
export type VoiceCallRecordingMethods =
  OnlyFunctionProperties<VoiceCallRecordingContract>

// ────────────────────────────────────────────────────────────
//  Final “Event” Exports
// ────────────────────────────────────────────────────────────

export type VoiceCallRecordingEvent =
  // Server Events
  | CallingCallRecordEvent
  // SDK Events
  | VoiceCallRecordingStartedEvent
  | VoiceCallRecordingUpdatedEvent
  | VoiceCallRecordingEndedEvent
  | VoiceCallRecordingFailedEvent

export type VoiceCallRecordingEventParams =
  // Server Event Params
  | CallingCallRecordEventParams
  // SDK Events
  | VoiceCallRecordingStartedEvent['params']
  | VoiceCallRecordingUpdatedEvent['params']
  | VoiceCallRecordingEndedEvent['params']
  | VoiceCallRecordingFailedEvent['params']

export type VoiceCallRecordAction = MapToPubSubShape<CallingCallRecordEvent>
