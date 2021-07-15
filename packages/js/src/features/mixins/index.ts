import { BaseConnection } from '@signalwire/webrtc'
import type { BaseRoomConstructor } from './withBaseRoomMethods'
import type { RoomLayoutConstructor } from './withRoomLayoutMethods'
import type { RoomMemberConstructor } from './withRoomMemberMethods'
import type { RoomControlConstructor } from './withRoomControlMethods'

export type Constructor<T = {}> = new (...args: any[]) => T
export type BCConstructor = Constructor<BaseConnection>

// RoomObject
export type RoomConstructor = typeof BaseConnection &
  BaseRoomConstructor &
  RoomLayoutConstructor &
  RoomMemberConstructor &
  RoomControlConstructor

// RoomDevice
export type RoomDeviceConstructor = typeof BaseConnection &
  BaseRoomConstructor &
  RoomMemberConstructor

// RoomScreenShare
export type RoomScreenShareConstructor = typeof BaseConnection &
  BaseRoomConstructor &
  RoomMemberConstructor

export * from './withBaseRoomMethods'
export * from './withRoomLayoutMethods'
export * from './withRoomMemberMethods'
export * from './withRoomControlMethods'
