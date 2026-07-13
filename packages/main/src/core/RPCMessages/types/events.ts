// =============================================================================
// SIGNALWIRE EVENT TYPES
// =============================================================================
// This file contains all SignalWire event-related types including event
// payloads, event requests, and event metadata wrappers.

/** @internal @packageDocumentation */

import type { EventChannel, ExtractParams, JSONRPCRequest } from './base';
import type { ConversationDetails, Layout, Member, MemberTalkingInfo, RoomSession } from './common';
import type { VertoParams } from './verto';
import type {
  CallConnectStates,
  CallDevice,
  CallDirection,
  CallPlayState,
  SignalingCallStates
} from '../../types/call.types';

// =============================================================================
// SIGNALWIRE EVENT DATA INTERFACES (Inner event payloads)
// =============================================================================

export interface SignalwireAuthorizationStatePayload {
  authorization_state: string;
}

export interface WebrtcMessagePayload {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: VertoParams;
}

export interface CallJoinedPayload {
  room_session: RoomSession;
  room_id: string;
  room_session_id: string;
  call_id: string;
  member_id: string;
  capabilities: string[];
  origin_call_id: string;
}

export interface CallLeftPayload {
  room_session: RoomSession;
  room_id: string;
  room_session_id: string;
  call_id: string;
  member_id: string;
  origin_call_id: string;
  reason: string;
}

export interface MemberUpdatedPayload {
  member: Member;
  room_id: string;
  room_session_id: string;
}

export interface MemberJoinedPayload {
  member: Member;
  room_id: string;
  room_session_id: string;
}

export interface MemberLeftPayload {
  member: Member;
  room_id: string;
  room_session_id: string;
  reason: string;
}

export interface MemberTalkingPayload {
  member: MemberTalkingInfo;
  room_id: string;
  room_session_id: string;
}

export interface LayoutChangedPayload {
  room_id: string;
  room_session_id: string;
  layout: Layout;
}

export interface CallUpdatedPayload {
  room_session: RoomSession;
  room_id: string;
  room_session_id: string;
}

export interface RoomUpdatedPayload {
  room_session: RoomSession;
  room_id: string;
  room_session_id: string;
}

/**
 * Describes the peer (remote) call referenced from a call.state event.
 *
 * Mirrors the backend (relay.c) `peer` shape.
 */
export interface CallStateRelatedCall {
  call_id?: string;
  node_id?: string;
}

export interface CallStatePayload {
  call_id: string;
  node_id: string;
  segment_id: string;
  call_state: SignalingCallStates;
  direction: CallDirection;
  device: CallDevice;
  /**
   * Epoch timestamps for the call lifecycle. Optional because pre-answer
   * states (e.g. `created`, `ringing`) do not have an `answer_time`/`end_time`
   * and the backend reports them as `0` or omits them.
   */
  start_time?: number;
  answer_time?: number;
  end_time?: number;
  room_session_id: string;
  /** The peer (remote) call this call is connected to, if any. */
  peer?: CallStateRelatedCall;
  /** Application-defined tag associated with the call. */
  tag?: string;
}

export interface CallPlayPayload {
  control_id: string;
  call_id: string;
  node_id: string;
  state: CallPlayState;
  room_session_id: string;
}

export interface CallConnectPayload {
  connect_state: CallConnectStates;
  call_id: string;
  node_id: string;
  segment_id: string;
  room_session_id: string;
  peer?: {
    call_id: string;
    node_id: string;
    device: CallDevice;
  };
}

export interface ConversationMessagePayload {
  id: string;
  type: string;
  subtype: string;
  kind: string;
  hidden: boolean;
  group_id: string;
  from_fabric_address_id: string;
  ts: number;
  metadata: Record<string, unknown>;
  details: ConversationDetails;
  text: string | null;
  conversation_name: string;
  user_name: string;
}

export type ConversationMessageUpdatedPayload = ConversationMessagePayload;

// =============================================================================
// SIGNALWIRE EVENT REQUEST INTERFACES
// =============================================================================

export interface SignalwireEventRequestBase<TPayload = unknown> {
  jsonrpc: '2.0';
  id: string;
  method: 'signalwire.event';
  params: {
    event_type: string;
    event_channel?: EventChannel;
    timestamp?: number | string;
    project_id?: string;
    node_id?: string;
    is_author?: boolean;
    params: TPayload;
  };
}

/**
 * Helper type for event request params.
 * Includes all common fields and narrows `event_type` to a specific literal.
 * Use `TOverrides` to narrow or add field types for specific events
 * (e.g., making `project_id` required or changing `timestamp` to `string`).
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Used as default for no overrides
type EventRequestParams<TEventType extends string, TPayload, TOverrides extends {} = {}> = Omit<
  {
    event_type: TEventType;
    event_channel: EventChannel;
    timestamp: number;
    project_id?: string;
    node_id?: string;
    is_author?: boolean;
    params: TPayload;
  },
  keyof TOverrides
> &
  TOverrides;

export interface SignalwireAuthorizationStateRequest extends SignalwireEventRequestBase<SignalwireAuthorizationStatePayload> {
  params: {
    event_type: 'signalwire.authorization.state';
    params: SignalwireAuthorizationStatePayload;
  };
}

export interface WebrtcMessageRequest extends SignalwireEventRequestBase<WebrtcMessagePayload> {
  params: EventRequestParams<
    'webrtc.message',
    WebrtcMessagePayload,
    {
      event_channel: string;
      project_id: string;
      node_id: string;
    }
  >;
}

export interface CallJoinedRequest extends SignalwireEventRequestBase<CallJoinedPayload> {
  params: EventRequestParams<'call.joined', CallJoinedPayload, { event_channel: string }>;
}

export interface CallLeftRequest extends SignalwireEventRequestBase<CallLeftPayload> {
  params: EventRequestParams<'call.left', CallLeftPayload, { event_channel: string }>;
}

export interface CallUpdatedRequest extends SignalwireEventRequestBase<CallUpdatedPayload> {
  params: EventRequestParams<'call.updated', CallUpdatedPayload, { event_channel: string }>;
}

export interface CallStateRequest extends SignalwireEventRequestBase<CallStatePayload> {
  params: EventRequestParams<'call.state', CallStatePayload, { event_channel: string }>;
}

export interface CallPlayRequest extends SignalwireEventRequestBase<CallPlayPayload> {
  params: EventRequestParams<'call.play', CallPlayPayload, { event_channel: string }>;
}

export interface CallConnectRequest extends SignalwireEventRequestBase<CallConnectPayload> {
  params: EventRequestParams<'call.connect', CallConnectPayload, { event_channel: string }>;
}

export interface RoomUpdatedRequest extends SignalwireEventRequestBase<RoomUpdatedPayload> {
  params: EventRequestParams<'room.updated', RoomUpdatedPayload, { event_channel: string }>;
}

export interface MemberUpdatedRequest extends SignalwireEventRequestBase<MemberUpdatedPayload> {
  params: EventRequestParams<'member.updated', MemberUpdatedPayload>;
}

export interface MemberJoinedRequest extends SignalwireEventRequestBase<MemberJoinedPayload> {
  params: EventRequestParams<'member.joined', MemberJoinedPayload>;
}

export interface MemberLeftRequest extends SignalwireEventRequestBase<MemberLeftPayload> {
  params: EventRequestParams<'member.left', MemberLeftPayload>;
}

export interface MemberTalkingRequest extends SignalwireEventRequestBase<MemberTalkingPayload> {
  params: EventRequestParams<'member.talking', MemberTalkingPayload>;
}

export interface LayoutChangedRequest extends SignalwireEventRequestBase<LayoutChangedPayload> {
  params: EventRequestParams<'layout.changed', LayoutChangedPayload>;
}

export interface ConversationMessageRequest extends SignalwireEventRequestBase<ConversationMessagePayload> {
  params: EventRequestParams<
    'conversation.message',
    ConversationMessagePayload,
    {
      event_channel: string;
      timestamp: string;
      is_author: boolean;
    }
  >;
}

export interface ConversationMessageUpdatedRequest extends SignalwireEventRequestBase<ConversationMessageUpdatedPayload> {
  params: EventRequestParams<
    'conversation.message.updated',
    ConversationMessageUpdatedPayload,
    {
      event_channel: string;
      timestamp: string;
      is_author: boolean;
    }
  >;
}

export type SignalwireCallRequest =
  | WebrtcMessageRequest
  | CallJoinedRequest
  | CallLeftRequest
  | CallUpdatedRequest
  | CallStateRequest
  | CallPlayRequest
  | CallConnectRequest
  | RoomUpdatedRequest
  | MemberUpdatedRequest
  | MemberJoinedRequest
  | MemberLeftRequest
  | MemberTalkingRequest
  | LayoutChangedRequest
  | ConversationMessageRequest
  | ConversationMessageUpdatedRequest;

export type SignalwireRequest = SignalwireAuthorizationStateRequest | SignalwireCallRequest;

// =============================================================================
// PING REQUEST (used by both client and server)
// =============================================================================

export interface SignalwirePingParams {
  timestamp: number;
}

export interface SignalwirePingRequest extends JSONRPCRequest<SignalwirePingParams> {
  method: 'signalwire.ping';
  params: SignalwirePingParams;
}

// =============================================================================
// EXTRACTED TYPE ALIASES (Event Metadata and Event Payloads)
// =============================================================================

export type SignalwireMetadata = SignalwireRequest['params'];

export type SignalwireCallMetadata =
  | ExtractParams<WebrtcMessageRequest>
  | ExtractParams<CallJoinedRequest>
  | ExtractParams<CallLeftRequest>
  | ExtractParams<CallUpdatedRequest>
  | ExtractParams<CallStateRequest>
  | ExtractParams<CallPlayRequest>
  | ExtractParams<CallConnectRequest>
  | ExtractParams<RoomUpdatedRequest>
  | ExtractParams<MemberUpdatedRequest>
  | ExtractParams<MemberJoinedRequest>
  | ExtractParams<MemberLeftRequest>
  | ExtractParams<MemberTalkingRequest>
  | ExtractParams<LayoutChangedRequest>
  | ExtractParams<ConversationMessageRequest>
  | ExtractParams<ConversationMessageUpdatedRequest>;

export type SignalwireInnerPayload =
  | SignalwireAuthorizationStatePayload
  | WebrtcMessagePayload
  | CallJoinedPayload
  | CallLeftPayload
  | CallUpdatedPayload
  | CallStatePayload
  | CallPlayPayload
  | CallConnectPayload
  | RoomUpdatedPayload
  | MemberUpdatedPayload
  | MemberJoinedPayload
  | MemberLeftPayload
  | MemberTalkingPayload
  | LayoutChangedPayload
  | ConversationMessagePayload
  // eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents -- Included for consistency with SignalwireCallRequest, even though it is an alias for ConversationMessagePayload
  | ConversationMessageUpdatedPayload;
