import StrictEventEmitter from 'strict-event-emitter-types'
import type {
  RoomEventNames,
  BaseConnectionState,
  EventsHandlerMapping,
} from '@signalwire/core'
import type { Room } from '../Room'

type BaseConnectionEventsHandlerMapping = EventsHandlerMapping &
  Record<BaseConnectionState, (params: Room) => void>

export type RoomObjectEvents = {
  [k in
    | RoomEventNames
    | BaseConnectionState]: BaseConnectionEventsHandlerMapping[k]
}

export type RoomObject = StrictEventEmitter<Room, RoomObjectEvents>

export type CreateScreenShareObjectOptions = {
  autoJoin?: boolean
  audio?: MediaStreamConstraints['audio']
  video?: MediaStreamConstraints['video']
}

export type CreateSecondSourceObjectOptions = {
  autoJoin?: boolean
  audio?: MediaStreamConstraints['audio']
  video?: MediaStreamConstraints['video']
}
