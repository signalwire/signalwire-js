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

// Utilities
export { getStorage, sessionStorageManager } from './utils/storage'
export { SwCloseEvent } from './utils/CloseEvent'

export const BROWSER_COMMON_VERSION = '0.0.0'

export type BrowserCommonConfig = {
  // Placeholder type
}