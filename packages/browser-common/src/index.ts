/**
 * @signalwire/browser-common
 * 
 * Common utilities for SignalWire browser SDKs.
 * This package provides shared functionality that can be used by both
 * the Video SDK and the Call Fabric SDK.
 */

// BaseRoomSession - Core session management
export {
  BaseRoomSession,
  BaseRoomSessionConnection,
  BaseRoomSessionOptions,
  BaseRoomSessionEvents,
  createBaseRoomSessionObject,
} from './BaseRoomSession'

// Client - WebSocket client for SignalWire
export {
  Client,
  ClientAPI,
  MakeRoomOptions,
} from './Client'

// JWTSession - JWT session management for browser
export { JWTSession } from './JWTSession'

// RoomSession Components
export {
  RoomSessionDevice,
  RoomSessionDeviceConnection,
  RoomSessionDeviceAPI,
  RoomSessionDeviceEvents,
  RoomDevice, // deprecated
} from './RoomSessionDevice'

export {
  RoomSessionScreenShare,
  RoomSessionScreenShareConnection,
  RoomSessionScreenShareAPI,
  RoomSessionScreenShareEvents,
  RoomScreenShare, // deprecated
} from './RoomSessionScreenShare'

// Interfaces
export {
  RoomSessionDeviceMethods,
  RoomScreenShareMethods,
} from './interfaces'

// Utilities
export { getStorage, sessionStorageManager } from './utils/storage'
export { SwCloseEvent } from './utils/CloseEvent'

// Test utilities
export {
  configureJestStore,
  configureFullStack,
  dispatchMockedRoomSubscribed,
  dispatchMockedCallJoined,
} from './testUtils'

export const BROWSER_COMMON_VERSION = '0.0.0'

export type BrowserCommonConfig = {
  // Placeholder type
}