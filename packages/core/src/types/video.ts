import { JSONRPCRequest } from '../utils/interfaces'
import { SwEvent } from '.'

type RoomStartedEventName = 'room.started'
type RoomEndedEventName = 'room.ended'
type RoomSubscribedEventName = 'room.subscribed'
type RoomUpdatedEventName = 'room.updated'

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

type LayoutChangedEventName = 'layout.changed'

// prettier-ignore
export type LayoutEvent =
  | LayoutChangedEventName

export type MemberJoinedEventName = 'member.joined'
export type MemberLeftEventName = 'member.left'
export type MemberUpdatedEventName = 'member.updated'
export type MemberTalkingEventName = 'member.talking'

export type MemberUpdatedEventNames =
  `${MemberUpdatedEventName}.${keyof RoomMemberProperties}`

export type MemberTalkingEventNames =
  | MemberTalkingEventName
  | `${MemberTalkingEventName}.start`
  | `${MemberTalkingEventName}.stop`

export type MemberEvent =
  | MemberJoinedEventName
  | MemberLeftEventName
  | MemberUpdatedEventName
  | MemberTalkingEventName

type RoomMemberType = 'member' | 'screen' | 'device'
export interface RoomMemberCommon {
  id: string
  room_id: string
  room_session_id: string
}
export interface RoomMemberProperties {
  scope_id: string
  parent_id?: string
  input_volume: number
  input_sensitivity: number
  output_volume: number
  on_hold: boolean
  deaf: boolean
  type: RoomMemberType
  visible: boolean
  audio_muted: boolean
  video_muted: boolean
  name: string
}

export type RoomMember = RoomMemberCommon &
  RoomMemberProperties & {
    type: 'member'
  }
export type RoomScreenShare = RoomMember & {
  parent_id: string
  type: 'screen'
}
export type RoomDevice = RoomMember & {
  parent_id: string
  type: 'device'
}
export type Member = RoomMember | RoomScreenShare | RoomDevice

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
  | MemberEvent
  | MemberUpdatedEventNames
  | MemberTalkingEventNames

/**
 * List of all the internal events
 * for the video sdk
 * @internal
 */
export type InternalVideoEvent =
  | `video.${RoomEvent}`
  | `video.${MemberEvent}`
  | `video.${LayoutEvent}`
  | `video.${MemberUpdatedEventNames}`
  | `video.${MemberTalkingEventNames}`
  | `video.room.joined`
  | RTCTrackEventName

interface RoomSubscribedEvent extends SwEvent {
  event_type: `video.${RoomSubscribedEventName}`
  params: RoomEventParams
}

interface MemberUpdatedEvent extends SwEvent {
  event_type: `video.${MemberUpdatedEventName}`
  params: {
    member: {
      updated: Array<keyof RoomMemberProperties>
    } & RoomMemberCommon &
      Partial<RoomMemberProperties>
  }
}

interface MemberJoinedEvent extends SwEvent {
  event_type: `video.${MemberJoinedEventName}`
  params: {
    member: Member
  }
}

interface MemberLeftEvent extends SwEvent {
  event_type: `video.${MemberLeftEventName}`
  params: {
    member: Member
  }
}

interface MemberTalkingEvent extends SwEvent {
  event_type: `video.${MemberTalkingEventName}`
  params: {
    member: RoomMemberCommon & {
      talking: boolean
    }
  }
}

interface LayoutChangedEvent extends SwEvent {
  event_type: `video.${LayoutChangedEventName}`
  params: {
    room_session_id: string
    room_id: string
    layout: Layout
  }
}

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
  Record<
    MemberUpdatedEventName | MemberUpdatedEventNames,
    (params: MemberUpdatedEvent['params']) => void
  > &
  Record<
    MemberTalkingEventNames,
    (params: MemberTalkingEvent['params']) => void
  > &
  Record<RoomEvent, (params: RoomEventParams) => void> &
  Record<RTCTrackEventName, (event: RTCTrackEvent) => void>
