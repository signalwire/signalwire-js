import { createRoomObject, Room } from './createRoomObject'
import { joinRoom } from './joinRoom'
import { MakeRoomOptions } from './Client'
import { RoomSession } from './RoomSession'
import { RoomSessionDevice, RoomDevice } from './RoomSessionDevice'
import {
  RoomSessionScreenShare,
  RoomScreenShare,
} from './RoomSessionScreenShare'

export {
  RoomSession,
  RoomSessionDevice,
  RoomSessionScreenShare,
  // Just to keep backwards compatibility.
  createRoomObject,
  joinRoom,
  Room,
  RoomDevice,
  RoomScreenShare,
}

export type { MakeRoomOptions }
export type {
  MemberCommandParams,
  MemberCommandWithVolumeParams,
  MemberCommandWithValueParams,
  DeprecatedMemberUpdatableProps,
  DeprecatedVideoMemberHandlerParams,
  VideoMemberHandlerParams,
} from './utils/interfaces'
export type { CreateRoomObjectOptions } from './createRoomObject'
export type { RoomSessionRecording } from '@signalwire/core'
