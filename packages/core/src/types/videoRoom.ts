import { SwEvent } from '.'
import { InternalVideoMember } from './videoMember'

export type CamelToSnakeCase<S extends string> =
  S extends `${infer T}${infer U}`
    ? `${T extends Capitalize<T>
        ? '_'
        : ''}${Lowercase<T>}${CamelToSnakeCase<U>}`
    : S

export type EntityUpdated<T> = T & {
  // TODO: `updated` should includes only the "updatable" keys
  updated: Array<keyof T>
}

export type VideoEventToInternal<T extends string> = `video.${T}`

/**
 * Public event types
 */
export type RoomStarted = 'room.started'
export type RoomSubscribed = 'room.subscribed'
export type RoomUpdated = 'room.updated'
export type RoomEnded = 'room.ended'

/**
 * List of public events
 */
export type VideoRoomEvent =
  | RoomStarted
  | RoomSubscribed
  | RoomUpdated
  | RoomEnded

/**
 * List of internal events
 * @internal
 */
export type InternalVideoRoomEvent = VideoEventToInternal<VideoRoomEvent>

/**
 * Base Interface for a VideoRoom entity
 */
export interface VideoRoom {
  // FIXME: missing `id` from server
  roomId: string
  roomSessionId: string
  eventChannel: string
  name: string
  locked: boolean
  recording: boolean
  meetingMode: boolean
  silentMode: boolean
  blindMode: boolean
  hideVideoMuted: boolean
  logosVisible: boolean
}

/**
 * VideoRoom entity plus `updated` field
 */
export type VideoRoomUpdated = EntityUpdated<VideoRoom>

/**
 * VideoRoom entity for internal usage (converted to snake_case)
 * @internal
 */
export type InternalVideoRoom = {
  [K in keyof VideoRoom as CamelToSnakeCase<K>]: VideoRoom[K]
}

/**
 * VideoRoom entity plus `updated` field
 * for internal usage (converted to snake_case)
 * @internal
 */
export type InternalVideoRoomUpdated = EntityUpdated<InternalVideoRoom>

/**
 * ==========
 * ==========
 * Server-Side Events
 * ==========
 * ==========
 */

/**
 * 'video.room.started'
 */
export interface VideoRoomStartedEventParams {
  room_id: string
  room_session_id: string
  // FIXME: this should be the full object
  room: Pick<
    InternalVideoRoom,
    'room_id' | 'room_session_id' | 'name' | 'event_channel'
  >
}

export interface VideoRoomStartedEvent extends SwEvent {
  event_type: VideoEventToInternal<RoomStarted>
  params: VideoRoomStartedEventParams
}

/**
 * 'video.room.subscribed'
 */
export interface VideoRoomSubscribedEventParams {
  room: InternalVideoRoom & {
    members: InternalVideoMember[]
    // TODO: add recordings[] and other bootstrap things
  }
  // FIXME: only for webrtc
  call_id: string
  member_id: string
}

export interface VideoRoomSubscribedEvent extends SwEvent {
  event_type: VideoEventToInternal<RoomSubscribed>
  params: VideoRoomSubscribedEventParams
}

/**
 * 'video.room.updated'
 */
export interface VideoRoomUpdatedEventParams {
  room_id: string
  room_session_id: string
  room: InternalVideoRoom
}

export interface VideoRoomUpdatedEvent extends SwEvent {
  event_type: VideoEventToInternal<RoomUpdated>
  params: VideoRoomUpdatedEventParams
}

/**
 * 'video.room.ended'
 */
export interface VideoRoomEndedEventParams {
  room_id: string
  room_session_id: string
  // FIXME: this should be the full object
  room: Pick<InternalVideoRoom, 'room_id' | 'room_session_id'>
}

export interface VideoRoomEndedEvent extends SwEvent {
  event_type: VideoEventToInternal<RoomEnded>
  params: VideoRoomEndedEventParams
}
