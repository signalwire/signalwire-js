import StrictEventEmitter from 'strict-event-emitter-types'
import type {
  GlobalVideoEvents,
  RoomEventNames,
  LayoutEvent,
  MemberJoinedEventName,
  MemberLeftEventName,
  MemberUpdatedEventName,
  MemberUpdatedEventNames,
  MemberTalkingEventNames,
  RoomEvent,
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

// TODO: replace `any` with proper types.
export type RealTimeRoomApiEventsHandlerMapping = Record<
  LayoutEvent,
  (layout: any) => void
> &
  Record<MemberJoinedEventName, (member: Member) => void> &
  Record<MemberLeftEventName, (member: Member) => void> &
  Record<
    MemberUpdatedEventName | MemberUpdatedEventNames,
    (member: Member) => void
  > &
  Record<MemberTalkingEventNames, (member: Member) => void> &
  Record<
    RoomEvent,
    (room: StrictEventEmitter<Room, RealTimeRoomApiEvents>) => void
  >

export type RealTimeRoomApiEvents = {
  [k in RealTimeRoomApiEventNames]: RealTimeRoomApiEventsHandlerMapping[k]
}
