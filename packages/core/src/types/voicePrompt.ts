import {
  CallingCallCollectEventParams,
  CallingCallCollectResult,
  OmitType,
  SpeechOrDigits,
  SwEvent,
  ToInternalVoiceEvent,
  VoiceCallPlayAudioParams,
  VoiceCallPlayRingtoneParams,
  VoiceCallPlayTTSParams,
  VoicePlaylist,
} from '..'
import { OnlyFunctionProperties, OnlyStateProperties } from './utils'

// ────────────────────────────────────────────────────────────
//  Private Event Types
// ────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────
//  Public Event Types
// ────────────────────────────────────────────────────────────

export type CallPromptStarted = 'prompt.started'
export type CallPromptStartOfInput = 'prompt.startOfInput'
export type CallPromptUpdated = 'prompt.updated'
export type CallPromptEnded = 'prompt.ended'
export type CallPromptFailed = 'prompt.failed'

export type VoiceCallPromptEventNames =
  | CallPromptStarted
  | CallPromptUpdated
  | CallPromptEnded
  | CallPromptFailed

// ────────────────────────────────────────────────────────────
//  Server side Events
// ────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────
//  SDK side Events
// ────────────────────────────────────────────────────────────

/**
 * 'calling.prompt.started'
 */
export interface VoiceCallPromptStartedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallPromptStarted>
  params: CallingCallCollectEventParams & { tag: string }
}
/**
 * 'calling.prompt.startOfInput'
 * Different from `started` because it's from the server
 */
export interface VoiceCallPromptStartOfInputEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallPromptStartOfInput>
  params: CallingCallCollectEventParams & { tag: string }
}
/**
 * 'calling.prompt.updated'
 */
export interface VoiceCallPromptUpdatedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallPromptUpdated>
  params: CallingCallCollectEventParams & { tag: string }
}
/**
 * 'calling.prompt.ended'
 */
export interface VoiceCallPromptEndedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallPromptEnded>
  params: CallingCallCollectEventParams & { tag: string }
}
/**
 * 'calling.prompt.failed'
 */
export interface VoiceCallPromptFailedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallPromptFailed>
  params: CallingCallCollectEventParams & { tag: string }
}

// ────────────────────────────────────────────────────────────
//  Voice Prompt Methods & Param Interfaces
// ────────────────────────────────────────────────────────────

export type VoiceCallPromptMethod =
  | 'calling.play_and_collect'
  | 'calling.play_and_collect.stop'
  | 'calling.play_and_collect.volume'

export type VoiceCallPromptMethodParams = SpeechOrDigits & {
  playlist: VoicePlaylist
  initialTimeout?: number
}
export type VoiceCallPromptAudioMethodParams = SpeechOrDigits &
  OmitType<VoiceCallPlayAudioParams> & {
    volume?: number
    initialTimeout?: number
  }
export type VoiceCallPromptRingtoneMethodParams = SpeechOrDigits &
  OmitType<VoiceCallPlayRingtoneParams> & {
    volume?: number
    initialTimeout?: number
  }
export type VoiceCallPromptTTSMethodParams = SpeechOrDigits &
  OmitType<VoiceCallPlayTTSParams> & {
    volume?: number
    initialTimeout?: number
  }

// ────────────────────────────────────────────────────────────
//  Voice CallPrompt Contract, Entity, Methods
// ────────────────────────────────────────────────────────────

export interface VoiceCallPromptContract {
  /** Unique id for this prompt */
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
  setVolume(volume: number): Promise<this>
  /**
   * @deprecated use {@link ended} instead.
   */
  waitForResult(): Promise<VoiceCallPromptContract>
  ended(): Promise<this>
}

/**
 * VoiceCallPrompt properties
 */
export type VoiceCallPromptEntity = OnlyStateProperties<VoiceCallPromptContract>

/**
 * VoiceCallPrompt methods
 */
export type VoiceCallPromptMethods =
  OnlyFunctionProperties<VoiceCallPromptContract>

// ────────────────────────────────────────────────────────────
//  Final “Event” Exports
// ────────────────────────────────────────────────────────────

export type VoiceCallPromptEvent =
  // SDK Events
  | VoiceCallPromptStartedEvent
  | VoiceCallPromptStartOfInputEvent
  | VoiceCallPromptUpdatedEvent
  | VoiceCallPromptEndedEvent
  | VoiceCallPromptFailedEvent

export type VoiceCallPromptEventParams =
  // SDK Event Params
  | VoiceCallPromptStartedEvent['params']
  | VoiceCallPromptStartOfInputEvent['params']
  | VoiceCallPromptUpdatedEvent['params']
  | VoiceCallPromptEndedEvent['params']
  | VoiceCallPromptFailedEvent['params']
