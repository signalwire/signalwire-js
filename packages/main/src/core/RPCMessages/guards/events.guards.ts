// =============================================================================
// SIGNALWIRE EVENT TYPE GUARDS
// =============================================================================
// This file contains type guards for SignalWire event types.

/** @internal @packageDocumentation */

import { hasProperty, isJSONRPCRequest, isObject } from './base.guards';

import type { TypeGuard, ExtractParams } from '../types/base';
import type {
  CallConnectPayload,
  CallJoinedPayload,
  CallJoinedRequest,
  CallLeftPayload,
  CallLeftRequest,
  CallPlayPayload,
  CallPlayRequest,
  CallStatePayload,
  CallStateRequest,
  CallUpdatedPayload,
  CallUpdatedRequest,
  CallConnectRequest,
  ConversationMessagePayload,
  ConversationMessageRequest,
  ConversationMessageUpdatedPayload,
  ConversationMessageUpdatedRequest,
  LayoutChangedPayload,
  LayoutChangedRequest,
  MemberJoinedPayload,
  MemberJoinedRequest,
  MemberLeftPayload,
  MemberLeftRequest,
  MemberTalkingPayload,
  MemberTalkingRequest,
  MemberUpdatedPayload,
  MemberUpdatedRequest,
  RoomUpdatedPayload,
  RoomUpdatedRequest,
  SignalwireAuthorizationStatePayload,
  SignalwireAuthorizationStateRequest,
  SignalwireCallMetadata,
  SignalwireCallRequest,
  SignalwireEventRequestBase,
  SignalwireMetadata,
  SignalwireRequest,
  WebrtcMessagePayload,
  WebrtcMessageRequest
} from '../types/events';

// =============================================================================
// TYPE GUARD FACTORY SYSTEM
// =============================================================================

/**
 * Registry of all SignalWire event types.
 * This is the single source of truth for event type strings.
 */
// eslint-disable-next-line unused-imports/no-unused-vars
const EVENT_TYPE_REGISTRY = {
  'signalwire.authorization.state': true,
  'webrtc.message': true,
  'call.joined': true,
  'call.left': true,
  'call.updated': true,
  'call.state': true,
  'call.play': true,
  'call.connect': true,
  'room.updated': true,
  'member.updated': true,
  'member.joined': true,
  'member.left': true,
  'member.talking': true,
  'layout.changed': true,
  'conversation.message': true,
  'conversation.message.updated': true
} as const;

export type RegisteredEventType = keyof typeof EVENT_TYPE_REGISTRY;

/**
 * Factory function to create Request-level type guards.
 */
export function createEventRequestGuard<T extends SignalwireEventRequestBase>(
  eventType: RegisteredEventType
): TypeGuard<T> {
  return (value: unknown): value is T =>
    isSignalwireRequest(value) && value.params.event_type === eventType;
}

/**
 * Factory function to create Metadata-level type guards.
 */
export function createEventMetadataGuard<T extends SignalwireMetadata>(
  eventType: RegisteredEventType
): TypeGuard<T> {
  return (value: unknown): value is T =>
    isSignalwireMetadata(value) && value.event_type === eventType;
}

// =============================================================================
// SIGNALWIRE EVENT TYPE GUARDS
// =============================================================================

export function isSignalwireRequest(value: unknown): value is SignalwireRequest {
  return (
    isJSONRPCRequest(value) &&
    value.method === 'signalwire.event' &&
    isObject(value.params) &&
    hasProperty(value.params, 'event_type')
  );
}

export function isSignalwireCallRequest(value: unknown): value is SignalwireCallRequest {
  return (
    isSignalwireRequest(value) &&
    (isCallJoinedRequest(value) ||
      isCallLeftRequest(value) ||
      isCallUpdatedRequest(value) ||
      isCallStateRequest(value) ||
      isCallPlayRequest(value) ||
      isCallConnectRequest(value) ||
      isRoomUpdatedRequest(value) ||
      isMemberUpdatedRequest(value) ||
      isMemberJoinedRequest(value) ||
      isMemberLeftRequest(value) ||
      isMemberTalkingRequest(value) ||
      isLayoutChangedRequest(value) ||
      isWebrtcMessageRequest(value) ||
      isConversationMessageRequest(value) ||
      isConversationMessageUpdatedRequest(value))
  );
}

// Generated Request guards using factory pattern
export const isSignalwireAuthorizationStateRequest =
  createEventRequestGuard<SignalwireAuthorizationStateRequest>('signalwire.authorization.state');

export const isWebrtcMessageRequest =
  createEventRequestGuard<WebrtcMessageRequest>('webrtc.message');

export const isCallJoinedRequest = createEventRequestGuard<CallJoinedRequest>('call.joined');

export const isCallLeftRequest = createEventRequestGuard<CallLeftRequest>('call.left');

export const isCallUpdatedRequest = createEventRequestGuard<CallUpdatedRequest>('call.updated');

export const isCallStateRequest = createEventRequestGuard<CallStateRequest>('call.state');

export const isCallPlayRequest = createEventRequestGuard<CallPlayRequest>('call.play');

export const isCallConnectRequest = createEventRequestGuard<CallConnectRequest>('call.connect');

export const isRoomUpdatedRequest = createEventRequestGuard<RoomUpdatedRequest>('room.updated');

export const isMemberUpdatedRequest =
  createEventRequestGuard<MemberUpdatedRequest>('member.updated');

export const isMemberJoinedRequest = createEventRequestGuard<MemberJoinedRequest>('member.joined');

export const isMemberLeftRequest = createEventRequestGuard<MemberLeftRequest>('member.left');

export const isMemberTalkingRequest =
  createEventRequestGuard<MemberTalkingRequest>('member.talking');

export const isLayoutChangedRequest =
  createEventRequestGuard<LayoutChangedRequest>('layout.changed');

export const isConversationMessageRequest =
  createEventRequestGuard<ConversationMessageRequest>('conversation.message');

export const isConversationMessageUpdatedRequest =
  createEventRequestGuard<ConversationMessageUpdatedRequest>('conversation.message.updated');

// =============================================================================
// SIGNALWIRE EVENT METADATA TYPE GUARDS (outer wrapper with event_type)
// =============================================================================

export function isSignalwireMetadata(value: unknown): value is SignalwireMetadata {
  return (
    isObject(value) &&
    hasProperty(value, 'event_type') &&
    typeof value.event_type === 'string' &&
    hasProperty(value, 'params')
  );
}

export function isSignalwireCallMetadata(value: unknown): value is SignalwireCallMetadata {
  return (
    isSignalwireMetadata(value) &&
    (isCallJoinedMetadata(value) ||
      isCallLeftMetadata(value) ||
      isCallUpdatedMetadata(value) ||
      isCallStateMetadata(value) ||
      isCallPlayMetadata(value) ||
      isCallConnectMetadata(value) ||
      isRoomUpdatedMetadata(value) ||
      isMemberUpdatedMetadata(value) ||
      isMemberJoinedMetadata(value) ||
      isMemberLeftMetadata(value) ||
      isMemberTalkingMetadata(value) ||
      isLayoutChangedMetadata(value) ||
      isWebrtcMessageMetadata(value) ||
      isConversationMessageMetadata(value) ||
      isConversationMessageUpdatedMetadata(value))
  );
}

// Generated Metadata guards using factory pattern
export const isSignalwireAuthorizationStateMetadata = createEventMetadataGuard<
  ExtractParams<SignalwireAuthorizationStateRequest>
>('signalwire.authorization.state');

export const isWebrtcMessageMetadata =
  createEventMetadataGuard<ExtractParams<WebrtcMessageRequest>>('webrtc.message');

export const isCallJoinedMetadata =
  createEventMetadataGuard<ExtractParams<CallJoinedRequest>>('call.joined');

export const isCallLeftMetadata =
  createEventMetadataGuard<ExtractParams<CallLeftRequest>>('call.left');

export const isCallUpdatedMetadata =
  createEventMetadataGuard<ExtractParams<CallUpdatedRequest>>('call.updated');

export const isCallStateMetadata =
  createEventMetadataGuard<ExtractParams<CallStateRequest>>('call.state');

export const isCallPlayMetadata =
  createEventMetadataGuard<ExtractParams<CallPlayRequest>>('call.play');

export const isCallConnectMetadata =
  createEventMetadataGuard<ExtractParams<CallConnectRequest>>('call.connect');

export const isRoomUpdatedMetadata =
  createEventMetadataGuard<ExtractParams<RoomUpdatedRequest>>('room.updated');

export const isMemberUpdatedMetadata =
  createEventMetadataGuard<ExtractParams<MemberUpdatedRequest>>('member.updated');

export const isMemberJoinedMetadata =
  createEventMetadataGuard<ExtractParams<MemberJoinedRequest>>('member.joined');

export const isMemberLeftMetadata =
  createEventMetadataGuard<ExtractParams<MemberLeftRequest>>('member.left');

export const isMemberTalkingMetadata =
  createEventMetadataGuard<ExtractParams<MemberTalkingRequest>>('member.talking');

export const isLayoutChangedMetadata =
  createEventMetadataGuard<ExtractParams<LayoutChangedRequest>>('layout.changed');

export const isConversationMessageMetadata =
  createEventMetadataGuard<ExtractParams<ConversationMessageRequest>>('conversation.message');

export const isConversationMessageUpdatedMetadata = createEventMetadataGuard<
  ExtractParams<ConversationMessageUpdatedRequest>
>('conversation.message.updated');

// =============================================================================
// EVENT PAYLOAD TYPE GUARDS
// =============================================================================

export function isSignalwireAuthorizationStatePayload(
  value: unknown
): value is SignalwireAuthorizationStatePayload {
  return isObject(value) && hasProperty(value, 'authorization_state');
}

export function isCallJoinedPayload(value: unknown): value is CallJoinedPayload {
  return (
    isObject(value) &&
    hasProperty(value, 'room_session') &&
    hasProperty(value, 'call_id') &&
    hasProperty(value, 'member_id') &&
    hasProperty(value, 'capabilities')
  );
}

export function isCallLeftPayload(value: unknown): value is CallLeftPayload {
  return (
    isObject(value) &&
    hasProperty(value, 'room_session') &&
    hasProperty(value, 'call_id') &&
    hasProperty(value, 'reason')
  );
}

/**
 * Payload-level guard for MemberUpdatedPayload.
 *
 * NOTE: This guard uses negative checks (`!hasProperty(value, 'reason')` and
 * `!hasProperty(member, 'talking')`) to distinguish from MemberLeftPayload and
 * MemberTalkingPayload, which share the same base shape (member, room_id,
 * room_session_id). These negative checks are fragile — if MemberUpdatedPayload
 * ever gains a `reason` or `talking` field, this guard will break.
 *
 * Prefer the metadata-level guard `isMemberUpdatedMetadata` which checks
 * `event_type === 'member.updated'` and is not susceptible to payload shape
 * overlap.
 */
export function isMemberUpdatedPayload(value: unknown): value is MemberUpdatedPayload {
  return (
    isObject(value) &&
    hasProperty(value, 'member') &&
    hasProperty(value, 'room_id') &&
    hasProperty(value, 'room_session_id') &&
    !hasProperty(value, 'reason') &&
    !hasProperty((value as MemberUpdatedPayload).member, 'talking')
  );
}

export function isMemberJoinedPayload(value: unknown): value is MemberJoinedPayload {
  return (
    isObject(value) &&
    hasProperty(value, 'member') &&
    hasProperty(value, 'room_id') &&
    !hasProperty(value, 'reason')
  );
}

export function isMemberLeftPayload(value: unknown): value is MemberLeftPayload {
  return (
    isObject(value) &&
    hasProperty(value, 'member') &&
    hasProperty(value, 'room_id') &&
    hasProperty(value, 'reason')
  );
}

export function isMemberTalkingPayload(value: unknown): value is MemberTalkingPayload {
  return (
    isObject(value) &&
    hasProperty(value, 'member') &&
    hasProperty(value, 'room_id') &&
    hasProperty(value, 'room_session_id') &&
    !hasProperty(value, 'reason') &&
    hasProperty((value as MemberTalkingPayload).member, 'talking')
  );
}

export function isLayoutChangedPayload(value: unknown): value is LayoutChangedPayload {
  return (
    isObject(value) &&
    hasProperty(value, 'room_id') &&
    hasProperty(value, 'room_session_id') &&
    hasProperty(value, 'layout')
  );
}

export function isCallUpdatedPayload(value: unknown): value is CallUpdatedPayload {
  return (
    isObject(value) &&
    hasProperty(value, 'room_session') &&
    hasProperty(value, 'room_id') &&
    hasProperty(value, 'room_session_id')
  );
}

/**
 * Payload-level guard for RoomUpdatedPayload.
 *
 * NOTE: RoomUpdatedPayload is structurally identical to CallUpdatedPayload
 * (both have `room_session`, `room_id`, `room_session_id`). This guard cannot
 * distinguish between them at the payload level.
 *
 * Prefer the metadata-level guard `isRoomUpdatedMetadata` which checks
 * `event_type === 'room.updated'` and is not susceptible to payload shape overlap.
 */
export function isRoomUpdatedPayload(value: unknown): value is RoomUpdatedPayload {
  return (
    isObject(value) &&
    hasProperty(value, 'room_session') &&
    hasProperty(value, 'room_id') &&
    hasProperty(value, 'room_session_id')
  );
}

export function isCallStatePayload(value: unknown): value is CallStatePayload {
  return (
    isObject(value) &&
    hasProperty(value, 'call_id') &&
    hasProperty(value, 'call_state') &&
    hasProperty(value, 'direction')
  );
}

export function isCallPlayPayload(value: unknown): value is CallPlayPayload {
  return (
    isObject(value) &&
    hasProperty(value, 'control_id') &&
    hasProperty(value, 'call_id') &&
    hasProperty(value, 'state')
  );
}

export function isCallConnectPayload(value: unknown): value is CallConnectPayload {
  return (
    isObject(value) &&
    hasProperty(value, 'connect_state') &&
    hasProperty(value, 'call_id') &&
    hasProperty(value, 'segment_id')
  );
}

export function isConversationMessagePayload(value: unknown): value is ConversationMessagePayload {
  return (
    isObject(value) &&
    hasProperty(value, 'id') &&
    hasProperty(value, 'type') &&
    hasProperty(value, 'kind') &&
    hasProperty(value, 'conversation_name')
  );
}

export function isConversationMessageUpdatedPayload(
  value: unknown
): value is ConversationMessageUpdatedPayload {
  return isConversationMessagePayload(value);
}

export function isWebrtcMessageEventInnerParams(value: unknown): value is WebrtcMessagePayload {
  return (
    isObject(value) &&
    hasProperty(value, 'jsonrpc') &&
    value.jsonrpc === '2.0' &&
    hasProperty(value, 'id') &&
    hasProperty(value, 'method') &&
    typeof value.method === 'string'
  );
}

// =============================================================================
// EVENT TYPE MAPPING
// =============================================================================

export const EventTypeMap = {
  'signalwire.authorization.state': isSignalwireAuthorizationStateRequest,
  'webrtc.message': isWebrtcMessageRequest,
  'call.joined': isCallJoinedRequest,
  'call.left': isCallLeftRequest,
  'call.updated': isCallUpdatedRequest,
  'call.state': isCallStateRequest,
  'call.play': isCallPlayRequest,
  'call.connect': isCallConnectRequest,
  'room.updated': isRoomUpdatedRequest,
  'member.updated': isMemberUpdatedRequest,
  'member.joined': isMemberJoinedRequest,
  'member.left': isMemberLeftRequest,
  'member.talking': isMemberTalkingRequest,
  'layout.changed': isLayoutChangedRequest,
  'conversation.message': isConversationMessageRequest,
  'conversation.message.updated': isConversationMessageUpdatedRequest
} as const;

export type EventType = keyof typeof EventTypeMap;

/**
 * Gets the appropriate type guard for an event type.
 */
export function getEventGuard(eventType: string): TypeGuard<SignalwireRequest> | undefined {
  return EventTypeMap[eventType as EventType];
}

// =============================================================================
// EVENT METADATA TYPE MAPPING
// =============================================================================

export const EventMetadataTypeMap = {
  'signalwire.authorization.state': isSignalwireAuthorizationStateMetadata,
  'webrtc.message': isWebrtcMessageMetadata,
  'call.joined': isCallJoinedMetadata,
  'call.left': isCallLeftMetadata,
  'call.updated': isCallUpdatedMetadata,
  'call.state': isCallStateMetadata,
  'call.play': isCallPlayMetadata,
  'call.connect': isCallConnectMetadata,
  'room.updated': isRoomUpdatedMetadata,
  'member.updated': isMemberUpdatedMetadata,
  'member.joined': isMemberJoinedMetadata,
  'member.left': isMemberLeftMetadata,
  'member.talking': isMemberTalkingMetadata,
  'layout.changed': isLayoutChangedMetadata,
  'conversation.message': isConversationMessageMetadata,
  'conversation.message.updated': isConversationMessageUpdatedMetadata
} as const;

/**
 * Gets the appropriate metadata type guard for an event type.
 */
export function getEventMetadataGuard(
  eventType: string
): TypeGuard<SignalwireMetadata> | undefined {
  return EventMetadataTypeMap[eventType as EventType];
}
