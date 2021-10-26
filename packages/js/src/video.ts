import { createRoomObject, Room } from './createRoomObject'
import { createClient } from './createClient'
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
  createClient,
}

/** @ignore */
export type { MakeRoomOptions }

/** @ignore */
export type {
  MemberCommandParams,
  MemberCommandWithVolumeParams,
  MemberCommandWithValueParams,
  DeprecatedMemberUpdatableProps,
  DeprecatedVideoMemberHandlerParams,
  VideoMemberHandlerParams,
} from './utils/interfaces'

export type { CreateRoomObjectOptions } from './createRoomObject'

export type {
  RoomSessionRecording,
  RoomSessionPlayback,
} from '@signalwire/core'

export type { RoomSessionEvents } from './RoomSession.docs'
