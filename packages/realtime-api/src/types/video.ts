import StrictEventEmitter from 'strict-event-emitter-types'
import type {
  GlobalVideoEvents,
  VideoMemberEventNames,
  RoomStarted,
  RoomEnded,
  VideoLayoutEventNames,
  MemberTalkingEventNames,
} from '@signalwire/core'
import { RoomSession } from '../video/RoomSession'
import { RoomSessionMember } from '../video/RoomSessionMember'

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
  >

export type RealTimeRoomApiEvents = {
  [k in keyof RealTimeRoomApiEventsHandlerMapping]: RealTimeRoomApiEventsHandlerMapping[k]
}
