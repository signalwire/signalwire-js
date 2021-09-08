import type { SwEvent } from '.'
import type { CamelToSnakeCase, ToInternalVideoEvent } from './utils'

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
 * Base Interface for a VideoRecording entity
 */
export interface VideoRecording {
  id: string
  state: 'recording' | 'paused' | 'completed'
  duration?: number
  startedAt?: number
  endedAt?: number
}

/**
 * VideoRecording entity for internal usage (converted to snake_case)
 * @internal
 */
export type InternalVideoRecording = {
  [K in keyof VideoRecording as CamelToSnakeCase<K>]: VideoRecording[K]
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
  recording: InternalVideoRecording
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
  recording: InternalVideoRecording
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
  recording: InternalVideoRecording
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
