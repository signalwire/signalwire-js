import type { SwEvent } from '.'
import type {
  CamelToSnakeCase,
  ToInternalVideoEvent,
  OnlyStateProperties,
  OnlyFunctionProperties,
} from './utils'

/**
 * Public event types
 */
export type PlaybackStarted = 'playback.started'
export type PlaybackUpdated = 'playback.updated'
export type PlaybackEnded = 'playback.ended'

/**
 * List of public event names
 */
export type VideoPlaybackEventNames =
  | PlaybackStarted
  | PlaybackUpdated
  | PlaybackEnded

/**
 * List of internal events
 * @internal
 */
export type InternalVideoPlaybackEventNames =
  ToInternalVideoEvent<VideoPlaybackEventNames>

/**
 * Public Contract for a VideoPlayback
 */
export interface VideoPlaybackContract {
  id: string
  roomSessionId: string
  state: 'playing' | 'paused' | 'completed'
  url: string
  volume: number
  startedAt: number
  endedAt?: number

  pause(): Promise<void>
  resume(): Promise<void>
  stop(): Promise<void>
  setVolume(volume: number): Promise<void>
}

/**
 * VideoPlayback properties
 */
export type VideoPlaybackEntity = OnlyStateProperties<VideoPlaybackContract>

/**
 * VideoPlayback methods
 */
export type VideoPlaybackMethods = OnlyFunctionProperties<VideoPlaybackContract>

/**
 * VideoPlaybackEntity entity for internal usage (converted to snake_case)
 * @internal
 */
export type InternalVideoPlaybackEntity = {
  [K in NonNullable<
    keyof VideoPlaybackEntity
  > as CamelToSnakeCase<K>]: VideoPlaybackEntity[K]
}

/**
 * ==========
 * ==========
 * Server-Side Events
 * ==========
 * ==========
 */

/**
 * 'video.playback.started'
 */
export interface VideoPlaybackStartedEventParams {
  room_id: string
  room_session_id: string
  playback: InternalVideoPlaybackEntity
}

export interface VideoPlaybackStartedEvent extends SwEvent {
  event_type: ToInternalVideoEvent<PlaybackStarted>
  params: VideoPlaybackStartedEventParams
}

/**
 * 'video.playback.updated'
 */
export interface VideoPlaybackUpdatedEventParams {
  room_id: string
  room_session_id: string
  playback: InternalVideoPlaybackEntity
}

export interface VideoPlaybackUpdatedEvent extends SwEvent {
  event_type: ToInternalVideoEvent<PlaybackUpdated>
  params: VideoPlaybackUpdatedEventParams
}

/**
 * 'video.playback.ended'
 */
export interface VideoPlaybackEndedEventParams {
  room_id: string
  room_session_id: string
  playback: InternalVideoPlaybackEntity
}

export interface VideoPlaybackEndedEvent extends SwEvent {
  event_type: ToInternalVideoEvent<PlaybackEnded>
  params: VideoPlaybackEndedEventParams
}

export type VideoPlaybackEvent =
  | VideoPlaybackStartedEvent
  | VideoPlaybackUpdatedEvent
  | VideoPlaybackEndedEvent

export type VideoPlaybackEventParams =
  | VideoPlaybackStartedEventParams
  | VideoPlaybackUpdatedEventParams
  | VideoPlaybackEndedEventParams
