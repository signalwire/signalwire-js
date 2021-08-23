import { JSONRPCRequest } from '../utils/interfaces'
import {
  MEMBER_EVENTS,
  INTERNAL_MEMBER_EVENTS,
  MEMBER_UPDATED_EVENTS,
  INTERNAL_MEMBER_UPDATED_EVENTS,
  MEMBER_TALKING_EVENTS,
  INTERNAL_MEMBER_TALKING_EVENTS,
  RoomMemberUpdatableProperties,
} from '../utils/constants'
import { SwEvent } from '.'

export type RoomStartedEventName = 'room.started'
export type RoomEndedEventName = 'room.ended'
export type RoomSubscribedEventName = 'room.subscribed'
export type RoomUpdatedEventName = 'room.updated'

export type RoomEvent =
  | RoomStartedEventName
  | RoomEndedEventName
  | RoomSubscribedEventName
  | RoomUpdatedEventName

export interface Layout {
  name: string
  room_session_id: string
  room_id: string
  layers: LayoutLayer[]
}

export interface LayoutLayer {
  member_id?: string
  y: number
  x: number
  height: number
  width: number
  layer_index: number
  z_index: number
  reservation: string
}

export type LayoutChangedEventName = 'layout.changed'

// prettier-ignore
export type LayoutEvent =
  | LayoutChangedEventName

export type MemberJoinedEventName = 'member.joined'
export type MemberLeftEventName = 'member.left'
export type MemberUpdatedEventName = 'member.updated'
export type MemberTalkingEventName = 'member.talking'

/**
 * See {@link MEMBER_EVENTS} for the full list of events.
 */
export type MemberEventNames = typeof MEMBER_EVENTS[number]

/**
 * See {@link MEMBER_UPDATED_EVENTS} for the full list of events.
 */
export type MemberUpdatedEventNames = typeof MEMBER_UPDATED_EVENTS[number]

/**
 * See {@link MEMBER_TALKING_EVENTS} for the full list of events.
 */
export type MemberTalkingEventNames = typeof MEMBER_TALKING_EVENTS[number]

export type RoomMemberType = 'member' | 'screen' | 'device'
export interface RoomMemberCommon {
  id: string
  room_id: string
  room_session_id: string
}

export interface RoomMemberProperties extends RoomMemberUpdatableProperties {
  parent_id?: string
  type: RoomMemberType
  name: string
}

export type RoomMember = RoomMemberCommon &
  RoomMemberProperties & {
    type: 'member'
  }
export type RoomScreenShare = RoomMemberCommon &
  RoomMemberProperties & {
    parent_id: string
    type: 'screen'
  }
export type RoomDevice = RoomMemberCommon &
  RoomMemberProperties & {
    parent_id: string
    type: 'device'
  }
export type Member = RoomMember | RoomScreenShare | RoomDevice

export type MemberUpdated = Member & {
  updated: Array<keyof RoomMemberUpdatableProperties>
}

export interface Room {
  blind_mode: boolean
  hide_video_muted: boolean
  locked: boolean
  logos_visible: boolean
  meeting_mode: boolean
  members?: Member[]
  name: string
  recording: boolean
  room_id: string
  room_session_id: string
  silent_mode: boolean
}

interface RoomEventParams {
  room: Room
  call_id: string
  member_id: string
}

export type RTCTrackEventName = 'track'

/**
 * List of all the events a RoomObject
 * can listen to
 */
export type RoomEventNames =
  | RoomEvent
  | RTCTrackEventName
  | LayoutEvent
  | MemberEventNames
  | MemberUpdatedEventNames
  | MemberTalkingEventNames

type InternalMemberEventNames = typeof INTERNAL_MEMBER_EVENTS[number]
type InternalMemberUpdatedEventNames =
  typeof INTERNAL_MEMBER_UPDATED_EVENTS[number]
type InternalMemberTalkingEventNames =
  typeof INTERNAL_MEMBER_TALKING_EVENTS[number]

/**
 * List of all the internal events
 * for the video sdk
 * @internal
 */
export type InternalVideoEvent =
  | `video.${RoomEvent}`
  | `video.${LayoutEvent}`
  | InternalMemberEventNames
  | InternalMemberUpdatedEventNames
  | InternalMemberTalkingEventNames
  | `video.room.joined`
  | RTCTrackEventName

interface RoomSubscribedEvent extends SwEvent {
  event_type: `video.${RoomSubscribedEventName}`
  params: RoomEventParams
}

interface MemberUpdatedEventParams {
  room_session_id: string
  room_id: string
  member: MemberUpdated
}

interface MemberUpdatedEvent extends SwEvent {
  event_type: `video.${MemberUpdatedEventName}`
  params: MemberUpdatedEventParams
}

interface MemberJoinedEventParams {
  room_session_id: string
  room_id: string
  member: Member
}

interface MemberJoinedEvent extends SwEvent {
  event_type: `video.${MemberJoinedEventName}`
  params: MemberJoinedEventParams
}

interface MemberLeftEventParams {
  room_session_id: string
  room_id: string
  member: Member
}

interface MemberLeftEvent extends SwEvent {
  event_type: `video.${MemberLeftEventName}`
  params: MemberLeftEventParams
}

interface MemberTalkingEventParams {
  room_session_id: string
  room_id: string
  member: RoomMemberCommon & {
    talking: boolean
  }
}

interface MemberTalkingEvent extends SwEvent {
  event_type: `video.${MemberTalkingEventName}`
  params: MemberTalkingEventParams
}

interface LayoutChangedEvent extends SwEvent {
  event_type: `video.${LayoutChangedEventName}`
  params: {
    room_session_id: string
    room_id: string
    layout: Layout
  }
}

export type MemberEventParams =
  | MemberJoinedEventParams
  | MemberLeftEventParams
  | MemberUpdatedEventParams
  | MemberTalkingEventParams

export type VideoAPIEventParams =
  | RoomSubscribedEvent
  | MemberUpdatedEvent
  | MemberJoinedEvent
  | MemberLeftEvent
  | MemberTalkingEvent
  | LayoutChangedEvent

export interface WebRTCMessageParams extends SwEvent {
  event_type: 'webrtc.message'
  project_id: string
  node_id: string
  params: JSONRPCRequest
}

export type EventsHandlerMapping = Record<
  LayoutEvent,
  (params: { layout: Layout }) => void
> &
  Record<MemberJoinedEventName, (params: { member: RoomMember }) => void> &
  Record<MemberLeftEventName, (params: { member: RoomMemberCommon }) => void> &
  Record<MemberUpdatedEventNames, (params: MemberUpdatedEventParams) => void> &
  Record<MemberTalkingEventNames, (params: MemberTalkingEventParams) => void> &
  Record<RoomEvent, (params: RoomEventParams) => void> &
  Record<RTCTrackEventName, (event: RTCTrackEvent) => void>
