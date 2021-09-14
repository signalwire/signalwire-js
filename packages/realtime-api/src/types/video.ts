import type {
  GlobalVideoEvents,
  VideoMemberEventNames,
  RoomStarted,
  RoomUpdated,
  RoomEnded,
  VideoLayoutEventNames,
  MemberTalkingEventNames,
  Rooms,
} from '@signalwire/core'
import type { RoomSession } from '../video/RoomSession'
import type { RoomSessionMember } from '../video/RoomSessionMember'

export type RealTimeVideoApiEventsHandlerMapping = Record<
  GlobalVideoEvents,
  (room: RoomSession) => void
>

export type RealTimeVideoApiEvents = {
  [k in keyof RealTimeVideoApiEventsHandlerMapping]: RealTimeVideoApiEventsHandlerMapping[k]
}

// TODO: replace `any` with proper types.
export type RealTimeRoomApiEventsHandlerMapping = Record<
  VideoLayoutEventNames,
  (layout: any) => void
> &
  Record<VideoMemberEventNames, (member: RoomSessionMember) => void> &
  Record<MemberTalkingEventNames, (member: RoomSessionMember) => void> &
  Record<RoomStarted | RoomEnded, (room: RoomSession) => void> &
  // TODO: we need to tweak the `room` param because it includes `updated` too in this event
  Record<RoomUpdated, (room: RoomSession) => void> &
  Rooms.RoomSessionRecordingEventsHandlerMapping

export type RealTimeRoomApiEvents = {
  [k in keyof RealTimeRoomApiEventsHandlerMapping]: RealTimeRoomApiEventsHandlerMapping[k]
}
