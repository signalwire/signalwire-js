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

/**
 * ==========
 * Server side Events
 * ==========
 */

/**
 * 'calling.call.play' event
 */
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

export interface CallingCallPlayEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<CallPlay>
  params: CallingCallPlayEventParams
}

/**
 * ==========
 * SDK side Events
 * ==========
 */

/**
 * List of public event names
 */
export type VoicePlaybackEventNames =
  | PlaybackStarted
  | PlaybackUpdated
  | PlaybackEnded
  | PlaybackFailed

export interface VoicePlaybackEventParams {
  node_id: string
  call_id: string
  control_id: string
  state: CallingCallPlayState
}

/**
 * 'playback.started'
 */
export interface VoicePlaybackStartedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<PlaybackStarted>
  params: VoicePlaybackEventParams
}
/**
 * 'playback.updated'
 */
export interface VoicePlaybackUpdatedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<PlaybackUpdated>
  params: VoicePlaybackEventParams
}
/**
 * 'playback.ended'
 */
export interface VoicePlaybackEndedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<PlaybackEnded>
  params: VoicePlaybackEventParams
}
/**
 * 'calling.playback.failed'
 */
export interface VoicePlaybackFailedEvent extends SwEvent {
  event_type: ToInternalVoiceEvent<PlaybackFailed>
  params: VoicePlaybackEventParams
}

/**
 * Voice play methods and params
 */

export type VoicePlayMethod =
  | 'calling.play'
  | 'calling.play.pause'
  | 'calling.play.resume'
  | 'calling.play.volume'
  | 'calling.play.stop'

export interface VoicePlayAudioParams {
  type: 'audio'
  url: string
}

export interface VoicePlayTTSParams {
  type: 'tts'
  text: string
  language?: string
  gender?: 'male' | 'female'
  voice?: string
}

export interface VoicePlaySilenceParams {
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

export interface VoicePlayRingtoneParams {
  type: 'ringtone'
  name: RingtoneName
  duration?: number
}

export type VoicePlayParams =
  | VoicePlayAudioParams
  | VoicePlayTTSParams
  | VoicePlaySilenceParams
  | VoicePlayRingtoneParams

export interface VoicePlayMethodParams {
  media: NestedArray<VoicePlayParams>
  volume?: number
}

export interface VoicePlayAudioMethodParams
  extends OmitType<VoicePlayAudioParams> {
  volume?: number
}

export interface VoicePlaylistAudioParams
  extends OmitType<VoicePlayAudioParams> {}

export interface VoicePlaySilenceMethodParams
  extends OmitType<VoicePlaySilenceParams> {}

export interface VoicePlaylistSilenceParams
  extends OmitType<VoicePlaySilenceParams> {}

export interface VoicePlayRingtoneMethodParams
  extends OmitType<VoicePlayRingtoneParams> {
  volume?: number
}
export interface VoicePlaylistRingtoneParams
  extends OmitType<VoicePlayRingtoneParams> {}

export interface VoicePlayTTSMethodParams extends OmitType<VoicePlayTTSParams> {
  volume?: number
}
export interface VoicePlaylistTTSParams extends OmitType<VoicePlayTTSParams> {}

export interface CreateVoicePlaylistParams {
  /** Default volume for the audio in the playlist. */
  volume?: number
}

export interface VoicePlaylist extends CreateVoicePlaylistParams {
  media: VoicePlayMethodParams['media']
  add(params: VoicePlayParams): this
}

/**
 * Public Contract for a VoicePlayback
 */
export interface VoicePlaybackContract {
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
 * VoicePlayback properties
 */
export type VoicePlaybackEntity = OnlyStateProperties<VoicePlaybackContract>

/**
 * VoicePlayback methods
 */
export type VoicePlaybackMethods = OnlyFunctionProperties<VoicePlaybackContract>

export type VoicePlaybackEvent =
  // Server Events
  | CallingCallPlayEvent
  // SDK Events
  | VoicePlaybackStartedEvent
  | VoicePlaybackUpdatedEvent
  | VoicePlaybackEndedEvent
  | VoicePlaybackFailedEvent

export type VoicePlaybackParams =
  // Server Event Params
  | CallingCallPlayEventParams
  // SDK Events
  | VoicePlaybackEventParams

export type VoicePlayAction = MapToPubSubShape<CallingCallPlayEvent>
