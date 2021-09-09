import StrictEventEmitter from 'strict-event-emitter-types'
import type {
  GlobalVideoEvents,
  VideoMemberEventNames,
  RoomStarted,
  RoomUpdated,
  RoomEnded,
  VideoLayoutEventNames,
  MemberTalkingEventNames,
} from '@signalwire/core'
import type { RoomSession } from '../video/RoomSession'
import type { RoomSessionMember } from '../video/RoomSessionMember'

// `Video` namespace related typings
export type RealTimeVideoApiGlobalEvents = GlobalVideoEvents

export type RealTimeVideoApiEventsHandlerMapping = Record<
  RealTimeVideoApiGlobalEvents,
  (room: StrictEventEmitter<RoomSession, RealTimeRoomApiEvents>) => void
>

export type RealTimeVideoApiEvents = {
  [k in RealTimeVideoApiGlobalEvents]: RealTimeVideoApiEventsHandlerMapping[k]
}

// TODO: replace `any` with proper types.
export type RealTimeRoomApiEventsHandlerMapping = Record<
  VideoLayoutEventNames,
  (layout: any) => void
> &
  Record<VideoMemberEventNames, (member: RoomSessionMember) => void> &
  Record<MemberTalkingEventNames, (member: RoomSessionMember) => void> &
  Record<
    RoomStarted | RoomEnded,
    (room: StrictEventEmitter<RoomSession, RealTimeRoomApiEvents>) => void
  > &
  // TODO: we need to tweak the `room` param because it includes `updated` too in this event
  Record<
    RoomUpdated,
    (room: StrictEventEmitter<RoomSession, RealTimeRoomApiEvents>) => void
  >

export type RealTimeRoomApiEvents = {
  [k in keyof RealTimeRoomApiEventsHandlerMapping]: RealTimeRoomApiEventsHandlerMapping[k]
}
