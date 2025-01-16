import {
  CallPlay,
  NestedArray,
  OmitType,
  OnlyFunctionProperties,
  OnlyStateProperties,
  PlaybackEnded,
  PlaybackFailed,
  PlaybackStarted,
  PlaybackUpdated,
  SwEvent,
  ToInternalVoiceEvent,
} from '.'
import { MapToPubSubShape } from '../redux/interfaces'

// ────────────────────────────────────────────────────────────
//  Private Event Types
// ────────────────────────────────────────────────────────────

// Defined in common.ts since other SDKs also use these types

// ────────────────────────────────────────────────────────────
//  Public Event Types
// ────────────────────────────────────────────────────────────

// Defined in common.ts since other SDKs also use these types

export type VoiceCallPlaybackEventNames =
  | PlaybackStarted
  | PlaybackUpdated
  | PlaybackEnded
  | PlaybackFailed

// ────────────────────────────────────────────────────────────
//  Server side Events
// ────────────────────────────────────────────────────────────

export type CallingCallPlayState = 'playing' | 'paused' | 'error' | 'finished'

export type CallingCallPlayEndState = Exclude<
  CallingCallPlayState,
  'playing' | 'paused'
>

export interface CallingCallPlayEventParams {
  node_id: string
  call_id: string
  control_id: string
  state: CallingCallPlayState
}

/**
 * 'calling.call.play'
 */
export interface CallingCallPlayEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallPlay>
  params: CallingCallPlayEventParams
}

// ────────────────────────────────────────────────────────────
//  SDK side Events
// ────────────────────────────────────────────────────────────

/**
 * 'calling.playback.started'
 */
export interface VoiceCallPlaybackStartedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<PlaybackStarted>
  params: CallingCallPlayEventParams & { tag: string }
}
/**
 * 'calling.playback.updated'
 */
export interface VoiceCallPlaybackUpdatedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<PlaybackUpdated>
  params: CallingCallPlayEventParams & { tag: string }
}
/**
 * 'calling.playback.ended'
 */
export interface VoiceCallPlaybackEndedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<PlaybackEnded>
  params: CallingCallPlayEventParams & { tag: string }
}
/**
 * 'calling.playback.failed'
 */
export interface VoiceCallPlaybackFailedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<PlaybackFailed>
  params: CallingCallPlayEventParams & { tag: string }
}

// ────────────────────────────────────────────────────────────
//  Voice Playback Methods & Param Interfaces
// ────────────────────────────────────────────────────────────

export type VoiceCallPlayMethod =
  | 'calling.play'
  | 'calling.play.pause'
  | 'calling.play.resume'
  | 'calling.play.volume'
  | 'calling.play.stop'

export interface VoiceCallPlayAudioParams {
  type: 'audio'
  url: string
}

export interface VoiceCallPlayTTSParams {
  type: 'tts'
  text: string
  language?: string
  gender?: 'male' | 'female'
  voice?: string
}

export interface VoiceCallPlaySilenceParams {
  type: 'silence'
  duration: number
}

export type RingtoneName =
  | 'at'
  | 'au'
  | 'bg'
  | 'br'
  | 'be'
  | 'ch'
  | 'cl'
  | 'cn'
  | 'cz'
  | 'de'
  | 'dk'
  | 'ee'
  | 'es'
  | 'fi'
  | 'fr'
  | 'gr'
  | 'hu'
  | 'il'
  | 'in'
  | 'it'
  | 'lt'
  | 'jp'
  | 'mx'
  | 'my'
  | 'nl'
  | 'no'
  | 'nz'
  | 'ph'
  | 'pl'
  | 'pt'
  | 'ru'
  | 'se'
  | 'sg'
  | 'th'
  | 'uk'
  | 'us'
  | 'tw'
  | 've'
  | 'za'

export interface VoiceCallPlayRingtoneParams {
  type: 'ringtone'
  name: RingtoneName
  duration?: number
}

export type VoiceCallPlayParams =
  | VoiceCallPlayAudioParams
  | VoiceCallPlayTTSParams
  | VoiceCallPlaySilenceParams
  | VoiceCallPlayRingtoneParams

export interface VoiceCallPlayMethodParams {
  media: NestedArray<VoiceCallPlayParams>
  volume?: number
}

export interface VoiceCallPlayAudioMethodParams
  extends OmitType<VoiceCallPlayAudioParams> {
  volume?: number
}

export interface VoicePlaylistAudioParams
  extends OmitType<VoiceCallPlayAudioParams> {}

export interface VoiceCallPlaySilenceMethodParams
  extends OmitType<VoiceCallPlaySilenceParams> {}

export interface VoicePlaylistSilenceParams
  extends OmitType<VoiceCallPlaySilenceParams> {}

export interface VoiceCallPlayRingtoneMethodParams
  extends OmitType<VoiceCallPlayRingtoneParams> {
  volume?: number
}
export interface VoicePlaylistRingtoneParams
  extends OmitType<VoiceCallPlayRingtoneParams> {}

export interface VoiceCallPlayTTSMethodParams
  extends OmitType<VoiceCallPlayTTSParams> {
  volume?: number
}
export interface VoicePlaylistTTSParams
  extends OmitType<VoiceCallPlayTTSParams> {}

export interface CreateVoicePlaylistParams {
  /** Default volume for the audio in the playlist. */
  volume?: number
}

export interface VoicePlaylist extends CreateVoicePlaylistParams {
  media: VoiceCallPlayMethodParams['media']
  add(params: VoiceCallPlayParams): this
}

// ────────────────────────────────────────────────────────────
//  Voice CallPlayback Contract, Entity, Methods
// ────────────────────────────────────────────────────────────

export interface VoiceCallPlaybackContract {
  /** Unique id for this playback */
  readonly id: string
  /** @ignore */
  readonly callId: string
  /** @ignore */
  readonly controlId: string
  /** @ignore */
  readonly volume: number
  /** @ignore */
  readonly state: CallingCallPlayState

  pause(): Promise<this>
  resume(): Promise<this>
  stop(): Promise<this>
  setVolume(volume: number): Promise<this>
  /**
   * @deprecated use {@link ended} instead.
   */
  waitForEnded(): Promise<this>
  ended(): Promise<this>
}

/**
 * VoiceCallPlayback properties
 */
export type VoiceCallPlaybackEntity =
  OnlyStateProperties<VoiceCallPlaybackContract>

/**
 * VoiceCallPlayback methods
 */
export type VoiceCallPlaybackMethods =
  OnlyFunctionProperties<VoiceCallPlaybackContract>

// ────────────────────────────────────────────────────────────
//  Final “Event” Exports
// ────────────────────────────────────────────────────────────

export type VoiceCallPlaybackEvent =
  // Server Events
  | CallingCallPlayEvent
  // SDK Events
  | VoiceCallPlaybackStartedEvent
  | VoiceCallPlaybackUpdatedEvent
  | VoiceCallPlaybackEndedEvent
  | VoiceCallPlaybackFailedEvent

export type VoiceCallPlaybackEventParams =
  // Server Event Params
  | CallingCallPlayEventParams
  // SDK Events
  | VoiceCallPlaybackStartedEvent['params']
  | VoiceCallPlaybackUpdatedEvent['params']
  | VoiceCallPlaybackEndedEvent['params']
  | VoiceCallPlaybackFailedEvent['params']

export type VoiceCallPlayAction = MapToPubSubShape<CallingCallPlayEvent>
