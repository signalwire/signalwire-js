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

// TODO: Future type exports will be added here as we implement the Call SDK
// 
// Call-related types (from future files):
// export type { CallSession, CallSessionMember } from './call';
//
// Event-related types (from future files):
// export type { CallJoinedEvent, CallUpdatedEvent, CallLeftEvent } from './events';
//
// Legacy compatibility types (from future files):
// export type { 
//   CallSession, 
//   CallSessionMember 
// } from './adapters';