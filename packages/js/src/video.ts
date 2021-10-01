import { createRoomObject, Room } from './createRoomObject'
import { joinRoom } from './joinRoom'
import { MakeRoomOptions } from './Client'
import { RoomScreenShare } from './RoomScreenShare'
import { RoomSessionDevice, RoomDevice } from './RoomSessionDevice'
import { RoomSession } from './RoomSession'

export {
  createRoomObject,
  joinRoom,
  RoomSession,
  RoomSessionDevice,
  // Just to keep backwards compatibility.
  Room,
  RoomScreenShare,
  RoomDevice,
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
