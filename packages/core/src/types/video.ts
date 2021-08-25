import { JSONRPCRequest } from '../utils/interfaces'
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

export type RecordingStartedEventName = 'recording.started'
export type RecordingUpdatedEventName = 'recording.updated'
export type RecordingStoppedEventName = 'recording.stopped'

// prettier-ignore
export type RecordingEvent =
  | RecordingStartedEventName
  | RecordingUpdatedEventName
  | RecordingStoppedEventName

export type MemberJoinedEventName = 'member.joined'
export type MemberLeftEventName = 'member.left'
export type MemberUpdatedEventName = 'member.updated'
export type MemberTalkingEventName = 'member.talking'

export type MemberUpdatedEventNames =
  `${MemberUpdatedEventName}.${keyof RoomMemberProperties}`

export type MemberTalkingEventNames =
  | MemberTalkingEventName
  | 'member.talking.start'
  | 'member.talking.stop'

export type MemberEvent =
  | MemberJoinedEventName
  | MemberLeftEventName
  | MemberUpdatedEventName
  | MemberTalkingEventName

export type RoomMemberType = 'member' | 'screen' | 'device'
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
  | RecordingEvent
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
  | `video.${RecordingEvent}`
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
    room_session_id: string
    room_id: string
    member: {
      updated: Array<keyof RoomMemberProperties>
    } & RoomMemberCommon &
      Partial<RoomMemberProperties>
  }
}

interface MemberJoinedEvent extends SwEvent {
  event_type: `video.${MemberJoinedEventName}`
  params: {
    room_session_id: string
    room_id: string
    member: Member
  }
}

interface MemberLeftEvent extends SwEvent {
  event_type: `video.${MemberLeftEventName}`
  params: {
    room_session_id: string
    room_id: string
    member: Member
  }
}

interface MemberTalkingEvent extends SwEvent {
  event_type: `video.${MemberTalkingEventName}`
  params: {
    room_session_id: string
    room_id: string
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

interface Recording {
  id: string
  state: 'active' | 'paused' | 'completed'
  url: string
  duration: number
  started_at: number
  ended_at: number
}

interface BaseRecordingEvent extends SwEvent {
  event_type: string
  params: {
    room_session_id: string
    room_id: string
    recording: Recording
  }
}

interface RecordingStartedEvent extends BaseRecordingEvent {
  event_type: `video.${RecordingStartedEventName}`
}

interface RecordingStoppedEvent extends BaseRecordingEvent {
  event_type: `video.${RecordingStoppedEventName}`
}

interface RecordingPausedEvent extends BaseRecordingEvent {
  event_type: `video.${RecordingPausedEventName}`
}

interface RecordingResumedEvent extends BaseRecordingEvent {
  event_type: `video.${RecordingResumedEventName}`
}

export type VideoAPIEventParams =
  | RoomSubscribedEvent
  | MemberUpdatedEvent
  | MemberJoinedEvent
  | MemberLeftEvent
  | MemberTalkingEvent
  | LayoutChangedEvent
  | RecordingStartedEvent
  | RecordingStoppedEvent
  | RecordingPausedEvent
  | RecordingResumedEvent

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
  Record<RTCTrackEventName, (event: RTCTrackEvent) => void> &
  Record<RecordingEvent, (params: { recording: Recording }) => void>
