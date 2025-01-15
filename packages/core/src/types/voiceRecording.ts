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

/**
 * ==========
 * Server side Events
 * ==========
 */

/**
 * 'calling.call.record'
 */
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

export interface CallingCallRecordEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallRecord>
  params: CallingCallRecordEventParams
}

export interface CallingCallRecordPauseMethodParams {
  behavior?: 'silence' | 'skip'
}

/**
 * ==========
 * SDK side Events
 * ==========
 */

/**
 * List of public event names
 */
export type VoiceCallRecordingEventNames =
  | RecordingStarted
  | RecordingUpdated
  | RecordingEnded
  | RecordingFailed

export interface VoiceCallRecordingEventParams
  extends CallingCallRecordEventParams {
  tag: string
}

/**
 * 'recording.started'
 */
export interface VoiceCallRecordingStartedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<RecordingStarted>
  params: VoiceCallRecordingEventParams
}
/**
 * 'recording.updated'
 */
export interface VoiceCallRecordingUpdatedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<RecordingUpdated>
  params: VoiceCallRecordingEventParams
}
/**
 * 'recording.ended'
 */
export interface VoiceCallRecordingEndedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<RecordingEnded>
  params: VoiceCallRecordingEventParams
}
/**
 * 'recording.failed'
 */
export interface VoiceCallRecordingFailedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<RecordingFailed>
  params: VoiceCallRecordingEventParams
}

/**
 * Voice call record methods and params
 */

export type VoiceCallRecordMethod =
  | 'calling.record'
  | 'calling.record.pause'
  | 'calling.record.resume'
  | 'calling.record.stop'

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

/**
 * Public Contract for a VoiceCallRecording
 */
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

export type VoiceCallRecordingEvent =
  // Server Events
  | CallingCallRecordEvent
  // SDK Events
  | VoiceCallRecordingStartedEvent
  | VoiceCallRecordingUpdatedEvent
  | VoiceCallRecordingEndedEvent
  | VoiceCallRecordingFailedEvent

export type VoiceCallRecordingParams =
  // Server Event Params
  | CallingCallRecordEventParams
  // SDK Events
  | VoiceCallRecordingEventParams

export type VoiceCallRecordAction = MapToPubSubShape<CallingCallRecordEvent>
