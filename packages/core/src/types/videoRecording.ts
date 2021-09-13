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
export type RecordingStarted = 'recording.started'
export type RecordingUpdated = 'recording.updated'
export type RecordingEnded = 'recording.ended'

/**
 * List of public event names
 */
export type VideoRecordingEventNames =
  | RecordingStarted
  | RecordingUpdated
  | RecordingEnded

/**
 * List of internal events
 * @internal
 */
export type InternalVideoRecordingEventNames =
  ToInternalVideoEvent<VideoRecordingEventNames>

/**
 * Public Contract for a VideoRecording
 */
export interface VideoRecordingContract {
  id: string
  state: 'recording' | 'paused' | 'completed'
  duration?: number
  startedAt?: number
  endedAt?: number

  pause(): Promise<void>
  resume(): Promise<void>
  stop(): Promise<void>
}

/**
 * VideoRecording properties
 */
export type VideoRecordingEntity = OnlyStateProperties<VideoRecordingContract>

/**
 * VideoRecording methods
 */
export type VideoRecordingMethods =
  OnlyFunctionProperties<VideoRecordingContract>

/**
 * VideoRecordingEntity entity for internal usage (converted to snake_case)
 * @internal
 */
export type InternalVideoRecordingEntity = {
  [K in NonNullable<
    keyof VideoRecordingEntity
  > as CamelToSnakeCase<K>]: VideoRecordingEntity[K]
}

/**
 * ==========
 * ==========
 * Server-Side Events
 * ==========
 * ==========
 */

/**
 * 'video.recording.started'
 */
export interface VideoRecordingStartedEventParams {
  room_id: string
  room_session_id: string
  recording: InternalVideoRecordingEntity
}

export interface VideoRecordingStartedEvent extends SwEvent {
  event_type: ToInternalVideoEvent<RecordingStarted>
  params: VideoRecordingStartedEventParams
}

/**
 * 'video.recording.updated'
 */
export interface VideoRecordingUpdatedEventParams {
  room_id: string
  room_session_id: string
  recording: InternalVideoRecordingEntity
}

export interface VideoRecordingUpdatedEvent extends SwEvent {
  event_type: ToInternalVideoEvent<RecordingUpdated>
  params: VideoRecordingUpdatedEventParams
}

/**
 * 'video.recording.ended'
 */
export interface VideoRecordingEndedEventParams {
  room_id: string
  room_session_id: string
  recording: InternalVideoRecordingEntity
}

export interface VideoRecordingEndedEvent extends SwEvent {
  event_type: ToInternalVideoEvent<RecordingEnded>
  params: VideoRecordingEndedEventParams
}

export type VideoRecordingEvent =
  | VideoRecordingStartedEvent
  | VideoRecordingUpdatedEvent
  | VideoRecordingEndedEvent

export type VideoRecordingEventParams =
  | VideoRecordingStartedEventParams
  | VideoRecordingUpdatedEventParams
  | VideoRecordingEndedEventParams
