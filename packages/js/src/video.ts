import { createRoomObject } from './createRoomObject'
import { joinRoom } from './joinRoom'
import { Client, MakeRoomOptions } from './Client'
import { Room } from './Room'
import { RoomScreenShare } from './RoomScreenShare'
import { RoomDevice } from './RoomDevice'

export { Client, createRoomObject, joinRoom, Room, RoomScreenShare, RoomDevice }

export type { MakeRoomOptions }
export type {
  RoomObject,
  MemberCommandParams,
  MemberCommandWithVolumeParams,
  MemberCommandWithValueParams,
} from './utils/interfaces'
export type { CreateRoomObjectOptions } from './createRoomObject'
export {
  MEMBER_EVENTS,
  MEMBER_UPDATED_EVENTS,
  MEMBER_TALKING_EVENTS,
} from '@signalwire/core'
