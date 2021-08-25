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
import { Room } from '../Room'

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
export type RealTimeRoomApiEventNames = Exclude<
  RoomEventNames,
  | 'track'
  // FIXME: support for recording events
  | 'recording.started'
  | 'recording.updated'
  | 'recording.stopped'
>

// TODO: replace `any` with proper types.
export type RealTimeRoomApiEventsHandlerMapping = Record<
  LayoutEvent,
  (layout: any) => void
> &
  Record<MemberJoinedEventName, (member: any) => void> &
  Record<MemberLeftEventName, (member: any) => void> &
  Record<
    MemberUpdatedEventName | MemberUpdatedEventNames,
    (member: any) => void
  > &
  Record<MemberTalkingEventNames, (member: any) => void> &
  Record<
    RoomEvent,
    (room: StrictEventEmitter<Room, RealTimeRoomApiEvents>) => void
  >

export type RealTimeRoomApiEvents = {
  [k in RealTimeRoomApiEventNames]: RealTimeRoomApiEventsHandlerMapping[k]
}
