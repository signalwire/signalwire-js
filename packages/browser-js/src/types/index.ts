/**
 * Type Definitions for @signalwire/browser-js
 * 
 * This module exports all type utilities and definitions for the Call Fabric SDK.
 * These types provide a clean, well-documented public API surface while maintaining
 * full type safety with the underlying @signalwire/core implementation.
 */

// Export all type utilities
export type {
  // Core prettification utilities
  Prettify,
  DeepPrettify,
  SimplifyUnion,
  ExpandRecursively,
  
  // Event handling utilities
  EventHandler,
  CleanEventMap,
  
  // Property manipulation utilities
  StripInternal,
  CamelCaseKeys,
  MakeOptional,
  OnlyMethods,
  OnlyState,
  
  // Advanced composition utilities
  RequireAtLeastOne,
  DeepPick,
  Merge,
  PartialExcept,
  
  // Runtime and branding utilities
  TypeGuard,
  Brand,
} from './utilities';

// Call-related types (clean public API)
export type { 
  CallSession, 
  CallSessionMember,
  CallCapabilities,
  CallLayout,
  CallLayoutLayer
} from './call';

// Event-related types (clean public API)
export type {
  // Call lifecycle events
  CallJoinedEvent,
  CallJoinedEventParams,
  CallUpdatedEvent,
  CallUpdatedEventParams,
  CallLeftEvent,
  CallLeftEventParams,
  
  // Call state events
  CallStateEvent,
  CallStateEventParams,
  CallPlayEvent,
  CallPlayEventParams,
  CallConnectEvent,
  CallConnectEventParams,
  CallRoomEvent,
  CallRoomEventParams,
  
  // Member events
  CallMemberJoinedEvent,
  CallMemberJoinedEventParams,
  CallMemberUpdatedEvent,
  CallMemberUpdatedEventParams,
  CallMemberLeftEvent,
  CallMemberLeftEventParams,
  CallMemberTalkingEvent,
  CallMemberTalkingEventParams,
  
  // Layout events
  CallLayoutChangedEvent,
  CallLayoutChangedEventParams,
  
  // Union types and utilities
  CallEvent,
  CallEventParams,
  CallEventHandlers,
  CallEventName
} from './events';

// Legacy compatibility types (deprecated, use new Call types)
export type {
  // Core type adapters
  FabricRoomSession,
  FabricRoomSessionMember,
  FabricRoomCapabilities,
  FabricRoomLayout,
  FabricRoomLayoutLayer,
  
  // Event type adapters - lifecycle
  RoomJoinedEvent,
  RoomJoinedEventParams,
  RoomUpdatedEvent,
  RoomUpdatedEventParams,
  RoomLeftEvent,
  RoomLeftEventParams,
  
  // Event type adapters - member events
  MemberJoinedEvent,
  MemberJoinedEventParams,
  MemberUpdatedEvent,
  MemberUpdatedEventParams,
  MemberLeftEvent,
  MemberLeftEventParams,
  MemberTalkingEvent,
  MemberTalkingEventParams,
  
  // Event type adapters - layout events
  LayoutChangedEvent,
  LayoutChangedEventParams,
  
  // Event type adapters - state events
  RoomStateEvent,
  RoomStateEventParams,
  RoomPlayEvent,
  RoomPlayEventParams,
  RoomConnectEvent,
  RoomConnectEventParams,
  RoomEvent,
  RoomEventParams,
  
  // Union type adapters
  FabricRoomEvent,
  FabricRoomEventParams,
  FabricRoomEventHandlers,
  FabricRoomEventName,
  RoomEventHandlers,
  
  // Migration utilities
  EventNameMigrationMap,
  Legacy
} from './adapters';