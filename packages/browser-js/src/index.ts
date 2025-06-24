/**
 * @signalwire/browser-js
 * 
 * SignalWire Browser SDK for unified communication.
 * This package provides the Call Fabric SDK functionality for browser applications,
 * including audio/video calling, chat, and messaging capabilities.
 */

// Export the main SignalWire client
export { SignalWire } from './SignalWire'

// Export WebRTC utilities re-exported from @signalwire/webrtc
export * as WebRTC from '@signalwire/webrtc'

// Export core Call Fabric components
export { CallSession } from './CallSession'
export { CallSessionMember } from './CallSessionMember'
export { WSClient } from './WSClient'
export { HTTPClient } from './HTTPClient'
export { Conversation } from './Conversation'

// Export default for UMD builds
export { SignalWire as default } from './SignalWire'

// Export type utilities for advanced TypeScript users
export type * from './types'

// Export interfaces for TypeScript users
export type * from './interfaces'