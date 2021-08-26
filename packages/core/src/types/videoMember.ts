import { SwEvent } from '.'
import { CamelToSnakeCase, EntityUpdated, VideoEventToInternal } from './utils'

/**
 * Used to not duplicate member fields across constants and types
 * and generate `MEMBER_UPDATED_EVENTS` below.
 * `key`: `type`
 */
export const MEMBER_UPDATABLE_PROPERTIES = {
  /**
   * FIXME: Move to camelCase and handle backwards compat.
   * with the browser package.
   */
  audio_muted: true,
  video_muted: true,
  deaf: true,
  on_hold: true,
  visible: true,
  input_volume: 1,
  output_volume: 1,
  input_sensitivity: 1,
}

export type VideoMemberUpdatableProperties = typeof MEMBER_UPDATABLE_PROPERTIES
export const MEMBER_UPDATED_EVENTS = Object.keys(
  MEMBER_UPDATABLE_PROPERTIES
).map((key) => {
  return `member.updated.${
    key as keyof VideoMemberUpdatableProperties
  }` as const
})

/**
 * Public event types
 */
export type MemberJoined = 'member.joined'
export type MemberLeft = 'member.left'
export type MemberUpdated = 'member.updated'
export type MemberTalking = 'member.talking'

// Generated by the SDK

/**
 * See {@link MEMBER_UPDATED_EVENTS} for the full list of events.
 */
export type MemberUpdatedEventNames = typeof MEMBER_UPDATED_EVENTS[number]
export type MemberTalkingStart = 'member.talking.start'
export type MemberTalkingStop = 'member.talking.stop'

export type MemberTalkingEventNames =
  | MemberTalking
  | MemberTalkingStart
  | MemberTalkingStop

/**
 * List of public events
 */
export type VideoMemberEventNames =
  | MemberJoined
  | MemberLeft
  | MemberUpdated
  | MemberUpdatedEventNames
  | MemberTalking
  | MemberTalkingStart
  | MemberTalkingStop

/**
 * List of internal events
 * @internal
 */
export type InternalVideoMemberEventNames =
  VideoEventToInternal<VideoMemberEventNames>

/**
 * Base Interface for a VideoMember entity
 */
export type VideoMemberType = 'member' | 'screen' | 'device'
export interface VideoMemberBase {
  id: string
  roomId: string
  roomSessionId: string
  name: string
  parentId?: string
  type: VideoMemberType
}

export interface VideoMember
  extends VideoMemberBase,
    VideoMemberUpdatableProperties {
  type: 'member'
}

export interface VideoMemberScreen
  extends VideoMemberBase,
    VideoMemberUpdatableProperties {
  type: 'screen'
  parentId: string
}

export interface VideoMemberDevice
  extends VideoMemberBase,
    VideoMemberUpdatableProperties {
  type: 'device'
  parentId: string
}

/**
 * VideoMember entity plus `updated` field
 */
export type VideoMemberUpdated = EntityUpdated<VideoMember>

/**
 * VideoMember entity for internal usage (converted to snake_case)
 * @internal
 */
export type InternalVideoMember = {
  [K in keyof VideoMember as CamelToSnakeCase<K>]: VideoMember[K]
}

/**
 * VideoMember entity plus `updated` field
 * for internal usage (converted to snake_case)
 * @internal
 */
export type InternalVideoMemberUpdated = EntityUpdated<InternalVideoMember>

/**
 * ==========
 * ==========
 * Server-Side Events
 * ==========
 * ==========
 */

/**
 * 'video.member.joined'
 */
export interface VideoMemberJoinedEventParams {
  room_session_id: string
  room_id: string
  member: InternalVideoMember
}

export interface VideoMemberJoinedEvent extends SwEvent {
  event_type: VideoEventToInternal<MemberJoined>
  params: VideoMemberJoinedEventParams
}

/**
 * 'video.member.updated'
 */
export interface VideoMemberUpdatedEventParams {
  room_session_id: string
  room_id: string
  member: InternalVideoMemberUpdated
}

export interface VideoMemberUpdatedEvent extends SwEvent {
  event_type: VideoEventToInternal<MemberUpdated>
  params: VideoMemberUpdatedEventParams
}

/**
 * 'video.member.left'
 */
export interface VideoMemberLeftEventParams {
  room_session_id: string
  room_id: string
  // TODO: check if we have full object here
  member: InternalVideoMember
}

export interface VideoMemberLeftEvent extends SwEvent {
  event_type: VideoEventToInternal<MemberLeft>
  params: VideoMemberLeftEventParams
}

/**
 * 'video.member.talking'
 */
export interface VideoMemberTalkingEventParams {
  room_session_id: string
  room_id: string
  member: Pick<InternalVideoMember, 'id'> & {
    talking: boolean
  }
}

export interface VideoMemberTalkingEvent extends SwEvent {
  event_type: VideoEventToInternal<MemberTalking>
  params: VideoMemberTalkingEventParams
}

export type VideoMemberEvent =
  | VideoMemberJoinedEvent
  | VideoMemberLeftEvent
  | VideoMemberUpdatedEvent
  | VideoMemberTalkingEvent

export type VideoMemberEventParams =
  | VideoMemberJoinedEventParams
  | VideoMemberLeftEventParams
  | VideoMemberUpdatedEventParams
  | VideoMemberTalkingEventParams
