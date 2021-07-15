import StrictEventEmitter from 'strict-event-emitter-types'
import type {
  RoomEventNames,
  BaseConnectionState,
  EventsHandlerMapping,
} from '@signalwire/core'
import type { Room } from '../Room'
import type { RoomScreenShare } from '../RoomScreenShare'
import type { RoomDevice } from '../RoomDevice'

type BaseConnectionEventsHandlerMapping = EventsHandlerMapping &
  Record<BaseConnectionState, (params: typeof Room) => void>

export type RoomObjectEvents = {
  [k in
    | RoomEventNames
    | BaseConnectionState]: BaseConnectionEventsHandlerMapping[k]
}

export type RoomObject = StrictEventEmitter<Room, RoomObjectEvents>
export type RoomScreenShareObject = StrictEventEmitter<
  RoomScreenShare,
  RoomObjectEvents
>
export type RoomDeviceObject = StrictEventEmitter<RoomDevice, RoomObjectEvents>

export type CreateScreenShareObjectOptions = {
  autoJoin?: boolean
  audio?: MediaStreamConstraints['audio']
  video?: MediaStreamConstraints['video']
}

export type AddDeviceOptions = {
  autoJoin?: boolean
  audio?: MediaStreamConstraints['audio']
  video?: MediaStreamConstraints['video']
}

export type AddCameraOptions = MediaTrackConstraints & {
  autoJoin?: boolean
}
export type AddMicrophoneOptions = MediaTrackConstraints & {
  autoJoin?: boolean
}

export interface MemberCommandParams {
  memberId?: string
}
export interface MemberCommandWithVolumeParams extends MemberCommandParams {
  volume: number
}
export interface MemberCommandWithValueParams extends MemberCommandParams {
  value: number
}
