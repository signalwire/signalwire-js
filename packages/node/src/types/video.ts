import StrictEventEmitter from 'strict-event-emitter-types'
import type {
  GlobalVideoEvents,
  RoomEventNames,
  LayoutEvent,
  MemberJoinedEventName,
  MemberLeftEventName,
  MemberUpdatedEventNames,
  MemberTalkingEventNames,
  RoomEvent,
  Member as MemberInterface,
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

// `Room`, `Member`, etc. related typings
export type RealTimeRoomApiEventNames = Exclude<RoomEventNames, 'track'>

export type RealTimeRoomMember = MemberInterface & { api: Member }

// TODO: replace `any` with proper types.
export type RealTimeRoomApiEventsHandlerMapping = Record<
  LayoutEvent,
  (layout: any) => void
> &
  Record<MemberJoinedEventName, (member: RealTimeRoomMember) => void> &
  Record<MemberLeftEventName, (member: RealTimeRoomMember) => void> &
  Record<MemberUpdatedEventNames, (member: RealTimeRoomMember) => void> &
  Record<MemberTalkingEventNames, (member: RealTimeRoomMember) => void> &
  Record<
    RoomEvent,
    (room: StrictEventEmitter<Room, RealTimeRoomApiEvents>) => void
  >

export type RealTimeRoomApiEvents = {
  [k in RealTimeRoomApiEventNames]: RealTimeRoomApiEventsHandlerMapping[k]
}
