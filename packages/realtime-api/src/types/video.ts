import StrictEventEmitter from 'strict-event-emitter-types'
import type {
  GlobalVideoEvents,
  VideoMemberEventNames,
  RoomStarted,
  RoomEnded,
  VideoLayoutEventNames,
  MemberTalkingEventNames,
} from '@signalwire/core'
import type { Room } from '../Room'
import type { Member } from '../Member'

// `Video` namespace related typings
export type RealTimeVideoApiGlobalEvents = GlobalVideoEvents

export type RealTimeVideoApiEventsHandlerMapping = Record<
  RealTimeVideoApiGlobalEvents,
  (room: StrictEventEmitter<Room, RealTimeRoomApiEvents>) => void
>

export type RealTimeVideoApiEvents = {
  [k in RealTimeVideoApiGlobalEvents]: RealTimeVideoApiEventsHandlerMapping[k]
}

// TODO: replace `any` with proper types.
export type RealTimeRoomApiEventsHandlerMapping = Record<
  VideoLayoutEventNames,
  (layout: any) => void
> &
  Record<VideoMemberEventNames, (member: Member) => void> &
  Record<MemberTalkingEventNames, (member: Member) => void> &
  Record<
    RoomStarted | RoomEnded,
    (room: StrictEventEmitter<Room, RealTimeRoomApiEvents>) => void
  >

export type RealTimeRoomApiEvents = {
  [k in keyof RealTimeRoomApiEventsHandlerMapping]: RealTimeRoomApiEventsHandlerMapping[k]
}
