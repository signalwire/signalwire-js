/**
 * Legacy Type Adapters for @signalwire/browser-js
 * 
 * This module provides backward compatibility for existing code that uses the old
 * "Fabric" and "Room" terminology. All types in this file are deprecated and will
 * be removed in a future major version.
 * 
 * These adapters allow existing code to continue working while encouraging migration
 * to the new "Call" terminology that better represents the unified communication
 * nature of the Call Fabric SDK.
 * 
 * @deprecated This entire module is deprecated. Use the new Call-based types instead.
 */

import type {
  // Core types
  CallSession,
  CallSessionMember,
  CallCapabilities,
  CallLayout,
  CallLayoutLayer
} from './call'

import type {
  // Event types
  CallJoinedEvent,
  CallJoinedEventParams,
  CallUpdatedEvent,
  CallUpdatedEventParams,
  CallLeftEvent,
  CallLeftEventParams,
  CallStateEvent,
  CallStateEventParams,
  CallPlayEvent,
  CallPlayEventParams,
  CallConnectEvent,
  CallConnectEventParams,
  CallRoomEvent,
  CallRoomEventParams,
  CallMemberJoinedEvent,
  CallMemberJoinedEventParams,
  CallMemberUpdatedEvent,
  CallMemberUpdatedEventParams,
  CallMemberLeftEvent,
  CallMemberLeftEventParams,
  CallMemberTalkingEvent,
  CallMemberTalkingEventParams,
  CallLayoutChangedEvent,
  CallLayoutChangedEventParams,
  
  // Union types
  CallEvent,
  CallEventParams,
  CallEventHandlers,
  CallEventName
} from './events'

// =====================================
// Core Type Adapters
// =====================================

/**
 * @deprecated Use `CallSession` instead. This type will be removed in the next major version.
 * 
 * The "Room" terminology has been replaced with "Call" to better represent the unified
 * communication capabilities of the Call Fabric SDK, which supports PSTN, SIP, SWML,
 * and WebRTC calls beyond just conference rooms.
 * 
 * @example
 * ```typescript
 * // Instead of:
 * import { FabricRoomSession } from '@signalwire/browser-js'
 * 
 * // Use:
 * import { CallSession } from '@signalwire/browser-js'
 * ```
 */
export type FabricRoomSession = CallSession

/**
 * @deprecated Use `CallSessionMember` instead. This type will be removed in the next major version.
 * 
 * @example
 * ```typescript
 * // Instead of:
 * import { FabricRoomSessionMember } from '@signalwire/browser-js'
 * 
 * // Use:
 * import { CallSessionMember } from '@signalwire/browser-js'
 * ```
 */
export type FabricRoomSessionMember = CallSessionMember

/**
 * @deprecated Use `CallCapabilities` instead. This type will be removed in the next major version.
 */
export type FabricRoomCapabilities = CallCapabilities

/**
 * @deprecated Use `CallLayout` instead. This type will be removed in the next major version.
 */
export type FabricRoomLayout = CallLayout

/**
 * @deprecated Use `CallLayoutLayer` instead. This type will be removed in the next major version.
 */
export type FabricRoomLayoutLayer = CallLayoutLayer

// =====================================
// Event Type Adapters - Lifecycle Events
// =====================================

/**
 * @deprecated Use `CallJoinedEvent` instead. This type will be removed in the next major version.
 * 
 * @example
 * ```typescript
 * // Instead of:
 * call.on('room.joined', (event: RoomJoinedEvent) => { ... })
 * 
 * // Use:
 * call.on('call.joined', (event: CallJoinedEvent) => { ... })
 * ```
 */
export type RoomJoinedEvent = CallJoinedEvent

/**
 * @deprecated Use `CallJoinedEventParams` instead. This type will be removed in the next major version.
 */
export type RoomJoinedEventParams = CallJoinedEventParams

/**
 * @deprecated Use `CallUpdatedEvent` instead. This type will be removed in the next major version.
 */
export type RoomUpdatedEvent = CallUpdatedEvent

/**
 * @deprecated Use `CallUpdatedEventParams` instead. This type will be removed in the next major version.
 */
export type RoomUpdatedEventParams = CallUpdatedEventParams

/**
 * @deprecated Use `CallLeftEvent` instead. This type will be removed in the next major version.
 */
export type RoomLeftEvent = CallLeftEvent

/**
 * @deprecated Use `CallLeftEventParams` instead. This type will be removed in the next major version.
 */
export type RoomLeftEventParams = CallLeftEventParams

// =====================================
// Event Type Adapters - Member Events
// =====================================

/**
 * @deprecated Use `CallMemberJoinedEvent` instead. This type will be removed in the next major version.
 * 
 * @example
 * ```typescript
 * // Instead of:
 * call.on('member.joined', (event: MemberJoinedEvent) => { ... })
 * 
 * // Use:
 * call.on('member.joined', (event: CallMemberJoinedEvent) => { ... })
 * ```
 */
export type MemberJoinedEvent = CallMemberJoinedEvent

/**
 * @deprecated Use `CallMemberJoinedEventParams` instead. This type will be removed in the next major version.
 */
export type MemberJoinedEventParams = CallMemberJoinedEventParams

/**
 * @deprecated Use `CallMemberUpdatedEvent` instead. This type will be removed in the next major version.
 */
export type MemberUpdatedEvent = CallMemberUpdatedEvent

/**
 * @deprecated Use `CallMemberUpdatedEventParams` instead. This type will be removed in the next major version.
 */
export type MemberUpdatedEventParams = CallMemberUpdatedEventParams

/**
 * @deprecated Use `CallMemberLeftEvent` instead. This type will be removed in the next major version.
 */
export type MemberLeftEvent = CallMemberLeftEvent

/**
 * @deprecated Use `CallMemberLeftEventParams` instead. This type will be removed in the next major version.
 */
export type MemberLeftEventParams = CallMemberLeftEventParams

/**
 * @deprecated Use `CallMemberTalkingEvent` instead. This type will be removed in the next major version.
 */
export type MemberTalkingEvent = CallMemberTalkingEvent

/**
 * @deprecated Use `CallMemberTalkingEventParams` instead. This type will be removed in the next major version.
 */
export type MemberTalkingEventParams = CallMemberTalkingEventParams

// =====================================
// Event Type Adapters - Layout Events  
// =====================================

/**
 * @deprecated Use `CallLayoutChangedEvent` instead. This type will be removed in the next major version.
 */
export type LayoutChangedEvent = CallLayoutChangedEvent

/**
 * @deprecated Use `CallLayoutChangedEventParams` instead. This type will be removed in the next major version.
 */
export type LayoutChangedEventParams = CallLayoutChangedEventParams

// =====================================
// Event Type Adapters - State Events
// =====================================

/**
 * @deprecated Use `CallStateEvent` instead. This type will be removed in the next major version.
 */
export type RoomStateEvent = CallStateEvent

/**
 * @deprecated Use `CallStateEventParams` instead. This type will be removed in the next major version.
 */
export type RoomStateEventParams = CallStateEventParams

/**
 * @deprecated Use `CallPlayEvent` instead. This type will be removed in the next major version.
 */
export type RoomPlayEvent = CallPlayEvent

/**
 * @deprecated Use `CallPlayEventParams` instead. This type will be removed in the next major version.
 */
export type RoomPlayEventParams = CallPlayEventParams

/**
 * @deprecated Use `CallConnectEvent` instead. This type will be removed in the next major version.
 */
export type RoomConnectEvent = CallConnectEvent

/**
 * @deprecated Use `CallConnectEventParams` instead. This type will be removed in the next major version.
 */
export type RoomConnectEventParams = CallConnectEventParams

/**
 * @deprecated Use `CallRoomEvent` instead. This type will be removed in the next major version.
 */
export type RoomEvent = CallRoomEvent

/**
 * @deprecated Use `CallRoomEventParams` instead. This type will be removed in the next major version.
 */
export type RoomEventParams = CallRoomEventParams

// =====================================
// Union Type Adapters
// =====================================

/**
 * @deprecated Use `CallEvent` instead. This type will be removed in the next major version.
 */
export type FabricRoomEvent = CallEvent

/**
 * @deprecated Use `CallEventParams` instead. This type will be removed in the next major version.
 */
export type FabricRoomEventParams = CallEventParams

/**
 * @deprecated Use `CallEventHandlers` instead. This type will be removed in the next major version.
 */
export type FabricRoomEventHandlers = CallEventHandlers

/**
 * @deprecated Use `CallEventName` instead. This type will be removed in the next major version.
 */
export type FabricRoomEventName = CallEventName

// =====================================
// Legacy Event Handler Map
// =====================================

/**
 * @deprecated Use `CallEventHandlers` instead. This type will be removed in the next major version.
 * 
 * This provides backward compatibility for the old room-based event handler pattern.
 * 
 * @example
 * ```typescript
 * // Instead of:
 * const handlers: RoomEventHandlers = {
 *   'room.joined': (params) => { ... },
 *   'member.joined': (params) => { ... }
 * }
 * 
 * // Use:
 * const handlers: CallEventHandlers = {
 *   'call.joined': (params) => { ... },
 *   'member.joined': (params) => { ... }
 * }
 * ```
 */
export type RoomEventHandlers = {
  'room.joined': CallEventHandlers['call.joined']
  'room.updated': CallEventHandlers['call.updated']
  'room.left': CallEventHandlers['call.left']
  'room.state': CallEventHandlers['call.state']
  'room.play': CallEventHandlers['call.play']
  'room.connect': CallEventHandlers['call.connect']
  'room.room': CallEventHandlers['call.room']
  'member.joined': CallEventHandlers['member.joined']
  'member.updated': CallEventHandlers['member.updated']
  'member.left': CallEventHandlers['member.left']
  'member.talking': CallEventHandlers['member.talking']
  'layout.changed': CallEventHandlers['layout.changed']
}

// =====================================
// Migration Utilities
// =====================================

/**
 * Migration utility type that maps old event names to new ones.
 * 
 * @deprecated This is a transitional utility. Use the new event names directly.
 */
export type EventNameMigrationMap = {
  'room.joined': 'call.joined'
  'room.updated': 'call.updated'
  'room.left': 'call.left'
  'room.state': 'call.state'
  'room.play': 'call.play'
  'room.connect': 'call.connect'
  'room.room': 'call.room'
}

/**
 * @deprecated This entire namespace is deprecated. Import types directly from the root module.
 * 
 * @example
 * ```typescript
 * // Instead of:
 * import { Legacy } from '@signalwire/browser-js'
 * type MySession = Legacy.FabricRoomSession
 * 
 * // Use:
 * import { CallSession } from '@signalwire/browser-js'
 * type MySession = CallSession
 * ```
 */
export namespace Legacy {
  export type FabricRoomSession = CallSession
  export type FabricRoomSessionMember = CallSessionMember
  export type RoomJoinedEvent = CallJoinedEvent
  export type RoomUpdatedEvent = CallUpdatedEvent
  export type RoomLeftEvent = CallLeftEvent
  export type MemberJoinedEvent = CallMemberJoinedEvent
  export type MemberUpdatedEvent = CallMemberUpdatedEvent
  export type MemberLeftEvent = CallMemberLeftEvent
}