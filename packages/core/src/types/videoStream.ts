import type { SwEvent } from '.'
import { MapToPubSubShape } from '..'
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
export type StreamStarted = 'stream.started'
export type StreamEnded = 'stream.ended'

/**
 * Public listener types
 */
export type OnStreamStarted = 'onStreamStarted'
export type OnStreamEnded = 'onStreamEnded'

/**
 * List of public event names
 */
export type VideoStreamEventNames = StreamStarted | StreamEnded

/**
 * List of public listener names
 */
export type VideoStreamListenerNames = OnStreamStarted | OnStreamEnded

/**
 * List of internal events
 * @internal
 */
export type InternalVideoStreamEventNames =
  ToInternalVideoEvent<VideoStreamEventNames>

/**
 * Public Contract for a VideoStream
 */
export interface VideoStreamContract {
  /** The unique id of this stream */
  id: string

  /** The id of the room session associated to this stream */
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

  /** Stops the stream */
  stop(): Promise<void>
}

/**
 * VideoStream properties
 */
export type VideoStreamEntity = OnlyStateProperties<VideoStreamContract>

/**
 * VideoStream methods
 */
export type VideoStreamMethods = OnlyFunctionProperties<VideoStreamContract>

/**
 * VideoStreamEntity entity for internal usage (converted
 * to snake_case and mapped to internal types.)
 * @internal
 */
export type InternalVideoStreamEntity = {
  [Property in NonNullable<
    keyof VideoStreamEntity
  > as CamelToSnakeCase<Property>]: ConvertToInternalTypes<
    Property,
    /**
     * Default type to be applied to `Property` in case
     * `ConvertToInternalTypes` doesn't have an explicit
     * conversion for the property.
     */
    VideoStreamEntity[Property]
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
export interface VideoStreamStartedEventParams {
  room_id: string
  room_session_id: string
  stream: InternalVideoStreamEntity
}

export interface VideoStreamStartedEvent extends SwEvent {
  event_type: ToInternalVideoEvent<StreamStarted>
  params: VideoStreamStartedEventParams
}

/**
 * 'video.stream.ended'
 */
export interface VideoStreamEndedEventParams {
  room_id: string
  room_session_id: string
  stream: InternalVideoStreamEntity
}

export interface VideoStreamEndedEvent extends SwEvent {
  event_type: ToInternalVideoEvent<StreamEnded>
  params: VideoStreamEndedEventParams
}

export type VideoStreamEvent = VideoStreamStartedEvent | VideoStreamEndedEvent

export type VideoStreamEventParams =
  | VideoStreamStartedEventParams
  | VideoStreamEndedEventParams

export type VideoStreamAction = MapToPubSubShape<VideoStreamEvent>
