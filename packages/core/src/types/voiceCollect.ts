import { MapToPubSubShape, SwEvent, ToInternalVoiceEvent } from '..'
import { OnlyFunctionProperties, OnlyStateProperties } from './utils'

// ────────────────────────────────────────────────────────────
//  Private Event Types
// ────────────────────────────────────────────────────────────

export type CallCollect = 'call.collect'

// ────────────────────────────────────────────────────────────
//  Public Event Types
// ────────────────────────────────────────────────────────────

export type CallCollectStarted = 'collect.started'
export type CallCollectStartOfInput = 'collect.startOfInput'
export type CallCollectUpdated = 'collect.updated'
export type CallCollectEnded = 'collect.ended'
export type CallCollectFailed = 'collect.failed'

export type VoiceCallCollectEventNames =
  | CallCollectStarted
  | CallCollectUpdated
  | CallCollectEnded
  | CallCollectFailed

// ────────────────────────────────────────────────────────────
//  Server side Events
// ────────────────────────────────────────────────────────────

interface CallingCallCollectResultError {
  type: 'error'
}

interface CallingCallCollectResultNoInput {
  type: 'no_input'
}

interface CallingCallCollectResultNoMatch {
  type: 'no_match'
}

interface CallingCallCollectResultStartOfInput {
  type: 'start_of_input'
}

interface CallingCallCollectResultDigit {
  type: 'digit'
  params: {
    digits: string
    terminator: string
  }
}

interface CallingCallCollectResultSpeech {
  type: 'speech'
  params: {
    text: string
    confidence: number
  }
}
export type CallingCallCollectResult =
  | CallingCallCollectResultError
  | CallingCallCollectResultNoInput
  | CallingCallCollectResultNoMatch
  | CallingCallCollectResultStartOfInput
  | CallingCallCollectResultDigit
  | CallingCallCollectResultSpeech

export type CallingCallCollectEndState = Exclude<
  CallingCallCollectResult['type'],
  'start_of_input'
>

export type CallingCallCollectState = 'error' | 'collecting' | 'finished'

export interface CallingCallCollectEventParams {
  node_id: string
  call_id: string
  control_id: string
  result: CallingCallCollectResult
  final?: boolean
  state?: CallingCallCollectState
}

/**
 * 'calling.call.collect'
 */
export interface CallingCallCollectEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallCollect>
  params: CallingCallCollectEventParams
}

// ────────────────────────────────────────────────────────────
//  SDK side Events
// ────────────────────────────────────────────────────────────

/**
 * 'calling.collect.started'
 */
export interface VoiceCallCollectStartedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallCollectStarted>
  params: CallingCallCollectEventParams & { tag: string }
}
/**
 * 'calling.collect.startOfInput'
 * Different from `started` because it's from the server
 */
export interface VoiceCallCollectStartOfInputEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallCollectStartOfInput>
  params: CallingCallCollectEventParams & { tag: string }
}
/**
 * 'calling.collect.updated'
 */
export interface VoiceCallCollectUpdatedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallCollectUpdated>
  params: CallingCallCollectEventParams & { tag: string }
}
/**
 * 'calling.collect.ended'
 */
export interface VoiceCallCollectEndedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallCollectEnded>
  params: CallingCallCollectEventParams & { tag: string }
}
/**
 * 'calling.collect.failed'
 */
export interface VoiceCallCollectFailedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallCollectFailed>
  params: CallingCallCollectEventParams & { tag: string }
}

// ────────────────────────────────────────────────────────────
//  Voice Collect Methods & Param Interfaces
// ────────────────────────────────────────────────────────────

export type VoiceCallCollectMethod =
  | 'calling.collect'
  | 'calling.collect.stop'
  | 'calling.collect.start_input_timers'

export type CollectDigitsConfig = {
  /** Max number of digits to collect. */
  max: number
  /** Timeout in seconds between each digit. */
  digitTimeout?: number
  /** DTMF digits that will end the collection. Default not set. */
  terminators?: string
}

export type CollectSpeechConfig = {
  /** How much silence to wait for end of speech. Default to 1 second. */
  endSilenceTimeout?: number
  /** Maximum time to collect speech. Default to 60 seconds. */
  speechTimeout?: number
  /** Language to detect. Default to `en-US`. */
  language?: string
  /** Array of expected phrases to detect. */
  hints?: string[]
  /** Model use for enhance speech recognition */
  model?: 'default' | 'enhanced' | 'enhanced.phone_call' | 'enhanced.video'
}

export type SpeechOrDigits =
  | {
      digits: CollectDigitsConfig
      speech?: never
    }
  | {
      digits?: never
      speech: CollectSpeechConfig
    }

export type VoiceCallCollectMethodParams = SpeechOrDigits & {
  initialTimeout?: number
  partialResults?: boolean
  continuous?: boolean
  sendStartOfInput?: boolean
  startInputTimers?: boolean
}

// ────────────────────────────────────────────────────────────
//  Voice CallCollect Contract, Entity, Methods
// ────────────────────────────────────────────────────────────

export interface VoiceCallCollectContract {
  /** Unique id for this collect */
  readonly id: string
  /** @ignore */
  readonly callId: string
  /** @ignore */
  readonly controlId: string

  readonly type?: CallingCallCollectResult['type']
  /** Alias for type in case of errors */
  readonly reason: string | undefined
  readonly digits: string | undefined
  readonly speech: string | undefined
  readonly terminator: string | undefined
  readonly text: string | undefined
  readonly confidence: number | undefined

  stop(): Promise<this>
  startInputTimers(): Promise<this>
  ended(): Promise<this>
}

/**
 * VoiceCallCollect properties
 */
export type VoiceCallCollectEntity =
  OnlyStateProperties<VoiceCallCollectContract>

/**
 * VoiceCallCollect methods
 */
export type VoiceCallCollectMethods =
  OnlyFunctionProperties<VoiceCallCollectContract>

// ────────────────────────────────────────────────────────────
//  Final “Event” Exports
// ────────────────────────────────────────────────────────────

export type VoiceCallCollectEvent =
  // Server Events
  | CallingCallCollectEvent
  // SDK Events
  | VoiceCallCollectStartedEvent
  | VoiceCallCollectStartOfInputEvent
  | VoiceCallCollectUpdatedEvent
  | VoiceCallCollectEndedEvent
  | VoiceCallCollectFailedEvent

export type VoiceCallCollectEventParams =
  // Server Event Params
  | CallingCallCollectEventParams
  // SDK Event Params
  | VoiceCallCollectStartedEvent['params']
  | VoiceCallCollectStartOfInputEvent['params']
  | VoiceCallCollectUpdatedEvent['params']
  | VoiceCallCollectEndedEvent['params']
  | VoiceCallCollectFailedEvent['params']

export type VoiceCallCollectAction = MapToPubSubShape<CallingCallCollectEvent>
