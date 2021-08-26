import { SwEvent } from '.'
import {
  CamelToSnakeCase,
  InternalEntityUpdated,
  VideoEventToInternal,
} from './videoRoom'

/**
 * Public event types
 */
export type MemberJoined = 'member.joined'
export type MemberLeft = 'member.left'
export type MemberUpdated = 'member.updated'
export type MemberTalking = 'member.talking'
export type MemberTalkingStart = 'member.talking.start'
export type MemberTalkingStop = 'member.talking.stop'

/**
 * List of public events
 */
export type VideoMemberEvent =
  | MemberJoined
  | MemberLeft
  | MemberUpdated
  // TODO: add updatable fields here
  | MemberTalking
  | MemberTalkingStart
  | MemberTalkingStop

/**
 * List of internal events
 * @internal
 */
export type InternalVideoMemberEvent = VideoEventToInternal<VideoMemberEvent>

/**
 * Base Interface for a VideoMember entity
 */
export type VideoMemberType = 'member' | 'screen' | 'device'
export interface VideoMember {
  id: string
  roomId: string
  roomSessionId: string
  name: string
  audioMuted: boolean
  videoMuted: boolean
  deaf: boolean
  onHold: boolean
  inputVolume: number
  outputVolume: number
  inputSensitivity: number
  visible: boolean
  type: VideoMemberType
}

/**
 * VideoMember entity plus `updated` field
 */
export type VideoMemberUpdated = InternalEntityUpdated<VideoMember>

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
export type InternalVideoMemberUpdated =
  InternalEntityUpdated<InternalVideoMember>

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
export interface MemberJoinedEventParams {
  room_session_id: string
  room_id: string
  member: InternalVideoMember
}

export interface MemberJoinedEvent extends SwEvent {
  event_type: VideoEventToInternal<MemberJoined>
  params: MemberJoinedEventParams
}

/**
 * 'video.member.updated'
 */
export interface MemberUpdatedEventParams {
  room_session_id: string
  room_id: string
  member: InternalVideoMemberUpdated
}

export interface MemberUpdatedEvent extends SwEvent {
  event_type: VideoEventToInternal<MemberUpdated>
  params: MemberUpdatedEventParams
}

/**
 * 'video.member.left'
 */
export interface MemberLeftEventParams {
  room_session_id: string
  room_id: string
  // TODO: check if we have full object here
  member: InternalVideoMember
}

export interface MemberLeftEvent extends SwEvent {
  event_type: VideoEventToInternal<MemberLeft>
  params: MemberLeftEventParams
}

/**
 * 'video.member.talking'
 */
export interface MemberTalkingEventParams {
  room_session_id: string
  room_id: string
  member: Pick<InternalVideoMember, 'id'> & {
    talking: boolean
  }
}

export interface MemberTalkingEvent extends SwEvent {
  event_type: VideoEventToInternal<MemberTalking>
  params: MemberTalkingEventParams
}
