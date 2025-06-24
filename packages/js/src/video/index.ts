import { createRoomObject, Room } from '../createRoomObject'
import { createClient } from '../createClient'
import { joinRoom } from '../joinRoom'
import type { MakeRoomOptions } from '@signalwire/browser-common'
import { RoomSession, RoomSessionOptions } from './RoomSession'
import type { RoomSessionDevice } from '@signalwire/browser-common'
import type { RoomDevice } from '@signalwire/browser-common'
import type {
  RoomSessionScreenShare,
} from '@signalwire/browser-common'
import type { RoomScreenShare } from '@signalwire/browser-common'

export {
  RoomSession,
  // Just to keep backwards compatibility.
  createRoomObject,
  joinRoom,
  Room,
  createClient,
}

// Export interfaces as types
export type { RoomDevice, RoomScreenShare, RoomSessionDevice, RoomSessionScreenShare }

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
