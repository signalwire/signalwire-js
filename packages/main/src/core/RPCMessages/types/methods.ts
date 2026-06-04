// =============================================================================
// CLIENT/SERVER METHOD TYPES
// =============================================================================
// This file contains types for client requests, server responses, and
// method-specific params and results.

import type { JSONRPCRequest, JSONRPCSuccessResponse } from './base';
import type { Authentication, AuthorizationInfo, IceServer, MemberTarget, Version } from './common';
import type { EmptyResult, VertoMethodMessage, WebrtcVertoResult } from './verto';

// =============================================================================
// RESULT INTERFACES
// =============================================================================

export interface SignalwireConnectResult {
  identity: string;
  authorization: AuthorizationInfo;
  protocol: string;
  ice_servers: IceServer[];
}

export interface SignalwirePingResult {
  timestamp: number;
}

export interface CallLayoutListResult {
  layouts: string[];
  code: string;
  message: string;
}

export interface CallMuteResult {
  code: string;
  message: string;
}

// =============================================================================
// CLIENT REQUEST PARAMS INTERFACES
// =============================================================================

export interface SignalwireConnectParams {
  version: Version;
  event_acks: boolean;
  agent: string;
  authentication: Authentication;
  protocol?: string;
  authorization_state?: string;
}

export interface WebrtcVertoParams<TVertoMessage = VertoMethodMessage> {
  message: TVertoMessage;
  callID: string;
  node_id: string;
  subscribe?: string[];
}

export interface CallTargetParams {
  self: MemberTarget;
  target: MemberTarget;
}

export interface CallMuteParams extends CallTargetParams {
  channels: ('audio' | 'video')[];
}

// =============================================================================
// CLIENT REQUEST INTERFACES
// =============================================================================

export interface SignalwireConnectRequest extends JSONRPCRequest<SignalwireConnectParams> {
  method: 'signalwire.connect';
  params: SignalwireConnectParams;
}

export interface WebrtcVertoRequest<TVertoMessage = VertoMethodMessage> extends JSONRPCRequest<
  WebrtcVertoParams<TVertoMessage>
> {
  method: 'webrtc.verto';
  params: WebrtcVertoParams<TVertoMessage>;
}

export interface CallLayoutListRequest extends JSONRPCRequest<CallTargetParams> {
  method: 'call.layout.list';
  params: CallTargetParams;
}

export interface CallMuteRequest extends JSONRPCRequest<CallMuteParams> {
  method: 'call.mute';
  params: CallMuteParams;
}

// =============================================================================
// RESPONSE INTERFACES
// =============================================================================

export interface SignalwireConnectResponse extends JSONRPCSuccessResponse<SignalwireConnectResult> {
  result: SignalwireConnectResult;
}

export interface SignalwirePingResponse extends JSONRPCSuccessResponse<SignalwirePingResult> {
  result: SignalwirePingResult;
}

export interface WebrtcVertoResponse extends JSONRPCSuccessResponse<WebrtcVertoResult> {
  result: WebrtcVertoResult;
}

export interface CallLayoutListResponse extends JSONRPCSuccessResponse<CallLayoutListResult> {
  result: CallLayoutListResult;
}

export interface CallMuteResponse extends JSONRPCSuccessResponse<CallMuteResult> {
  result: CallMuteResult;
}

export interface EmptyResponse extends JSONRPCSuccessResponse<EmptyResult> {
  result: EmptyResult;
}
