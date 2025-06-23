import { createRoomObject, Room } from '../createRoomObject'
import { createClient } from '../createClient'
import { joinRoom } from '../joinRoom'
import { MakeRoomOptions } from '@signalwire/browser-common'
import { RoomSession, RoomSessionOptions } from './RoomSession'
import { RoomSessionDevice, RoomDevice } from '@signalwire/browser-common'
import {
  RoomSessionScreenShare,
  RoomScreenShare,
} from '@signalwire/browser-common'

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
export type { MakeRoomOptions, RoomSessionOptions }

/** @ignore */
export type {
  DeprecatedMemberUpdatableProps,
  DeprecatedVideoMemberHandlerParams,
  VideoMemberHandlerParams,
  VideoMemberListUpdatedParams,
} from '../utils/interfaces'

export type { CreateRoomObjectOptions } from '../createRoomObject'

export type {
  RoomSessionRecording,
  RoomSessionPlayback,
} from '@signalwire/core'

export { VideoRoomSession, isVideoRoomSession } from './VideoRoomSession'
