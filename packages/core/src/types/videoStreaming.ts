import type { SwEvent } from '.'
import type {
  CamelToSnakeCase,
  ConvertToInternalTypes,
  ToInternalVideoEvent,
  OnlyStateProperties,
  OnlyFunctionProperties,
} from './utils'

/**
 * Public event types
 */
export type StreamingStarted = 'stream.started'
export type StreamingEnded = 'stream.ended'

/**
 * List of public event names
 */
export type VideoStreamingEventNames = StreamingStarted | StreamingEnded

/**
 * List of internal events
 * @internal
 */
export type InternalVideoStreamingEventNames =
  ToInternalVideoEvent<VideoStreamingEventNames>

/**
 * Public Contract for a VideoStreaming
 */
export interface VideoStreamingContract {
  /** The unique id of this streaming */
  id: string

  /** The id of the room session associated to this streaming */
  roomSessionId: string

  /** Current state */
  state: 'streaming' | 'completed'

  /** The URL of the stream */
  url?: string

  /** Duration, if available */
  duration?: number

  /** Start time, if available */
  startedAt?: Date

  /** End time, if available */
  endedAt?: Date

  /** Stops the streaming */
  stop(): Promise<void>
}

/**
 * VideoStreaming properties
 */
export type VideoStreamingEntity = OnlyStateProperties<VideoStreamingContract>

/**
 * VideoStreaming methods
 */
export type VideoStreamingMethods =
  OnlyFunctionProperties<VideoStreamingContract>

/**
 * VideoStreamingEntity entity for internal usage (converted
 * to snake_case and mapped to internal types.)
 * @internal
 */
export type InternalVideoStreamingEntity = {
  [Property in NonNullable<
    keyof VideoStreamingEntity
  > as CamelToSnakeCase<Property>]: ConvertToInternalTypes<
    Property,
    /**
     * Default type to be applied to `Property` in case
     * `ConvertToInternalTypes` doesn't have an explicit
     * conversion for the property.
     */
    VideoStreamingEntity[Property]
  >
}

/**
 * ==========
 * ==========
 * Server-Side Events
 * ==========
 * ==========
 */

/**
 * 'video.stream.started'
 */
export interface VideoStreamingStartedEventParams {
  room_id: string
  room_session_id: string
  stream: InternalVideoStreamingEntity
}

export interface VideoStreamingStartedEvent extends SwEvent {
  event_type: ToInternalVideoEvent<StreamingStarted>
  params: VideoStreamingStartedEventParams
}

/**
 * 'video.stream.ended'
 */
export interface VideoStreamingEndedEventParams {
  room_id: string
  room_session_id: string
  stream: InternalVideoStreamingEntity
}

export interface VideoStreamingEndedEvent extends SwEvent {
  event_type: ToInternalVideoEvent<StreamingEnded>
  params: VideoStreamingEndedEventParams
}

export type VideoStreamingEvent =
  | VideoStreamingStartedEvent
  | VideoStreamingEndedEvent

export type VideoStreamingEventParams =
  | VideoStreamingStartedEventParams
  | VideoStreamingEndedEventParams
