// =============================================================================
// VERTO PROTOCOL TYPES
// =============================================================================
// This file contains all Verto protocol-specific types including method
// messages, params, and results used for WebRTC signaling.

import type { JSONRPCResponse } from './base';
import type { DialogParams, MediaParams, PartialDialogParams } from './common';
import type { VertoMethod } from '../../types/rpc.types';

// =============================================================================
// RESULT INTERFACES
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EmptyResult {}

export interface VertoInviteResult {
  message: string;
  callID: string;
  memberID: string;
}

export interface VertoByeResult {
  callID: string;
  message: string;
  causeCode: number | string;
  cause: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface VertoAnswerAckResult {}

export type VertoMethodResult =
  | VertoInviteResult
  | VertoByeResult
  | VertoAnswerAckResult
  | EmptyResult;

export interface WebrtcVertoResult {
  node_id: string;
  code: string;
  result: VertoMethodResult | JSONRPCResponse<VertoMethodResult>;
}

// =============================================================================
// VERTO METHOD MESSAGE INTERFACES (Nested inside webrtc.message events)
// =============================================================================

export interface VertoMethodMessage<TParams extends VertoParams = VertoParams> {
  jsonrpc: '2.0';
  id: number | string;
  method: VertoMethod;
  params?: TParams;
  result?: unknown;
}

export interface VertoParams {
  userVariables?: Record<string, unknown>;
}

export interface VertoAnswerParams extends VertoParams {
  callID: string;
  sdp?: string;
}

export interface VertoMediaParams extends VertoParams {
  callID: string;
  sdp: string;
}

export interface VertoMediaParamsParams extends VertoParams {
  callID: string;
  mediaParams: MediaParams;
}

export interface VertoPingParams extends VertoParams {
  callID: string;
  dialogParams: PartialDialogParams;
}

export interface VertoPongParams extends VertoParams {
  callID: string;
  dialogParams: PartialDialogParams;
}

export interface VertoInviteParams extends VertoParams {
  dialogParams?: DialogParams;
  sdp: string;
  callID: string;
  caller_id_name: string;
  caller_id_number: string;
  callee_id_name: string;
  callee_id_number: string;
  display_direction: string;
}

export type VertoByeCause = 'NORMAL_CLEARING' | 'USER_BUSY' | 'MEDIA_TIMEOUT';

/**
 * Outbound `verto.bye` params — the shape the `VertoBye` builder sends to the
 * server. `callID` travels inside `dialogParams`; `cause`/`causeCode` are sent
 * together when the hangup carries a reason.
 */
export interface VertoByeParams extends VertoParams {
  dialogParams: PartialDialogParams;
  cause?: VertoByeCause;
  causeCode?: number | string;
}

/**
 * Inbound `verto.bye` params — the shape the server emits when the remote ends
 * the call. Unlike the outbound builder, `callID` is top-level (no
 * `dialogParams`) and `cause`/`causeCode` describe why the call ended.
 */
export interface VertoByeInboundParams extends VertoParams {
  callID: string;
  cause?: VertoByeCause;
  causeCode?: number | string;
}

export type VertoDisplayDirection = 'inbound' | 'outbound';

export interface VertoAttachParams extends VertoParams {
  callID: string;
  sdp: string;
  callee_id_number: string;
  callee_id_name: string;
  caller_id_number: string;
  caller_id_name: string;
  display_direction: VertoDisplayDirection;
  variables?: Record<string, unknown>;
}

export interface VertoAnswerResultParams {
  method: 'verto.answer';
}

// Specific Verto Messages
export interface VertoAnswerMessage extends VertoMethodMessage<VertoAnswerParams> {
  method: 'verto.answer';
  params: VertoAnswerParams;
}

export interface VertoMediaMessage extends VertoMethodMessage<VertoMediaParams> {
  method: 'verto.media';
  params: VertoMediaParams;
}

export interface VertoMediaParamsMessage extends VertoMethodMessage<VertoMediaParamsParams> {
  method: 'verto.mediaParams';
  params: VertoMediaParamsParams;
}

export interface VertoPingMessage extends VertoMethodMessage<VertoPingParams> {
  method: 'verto.ping';
  params: VertoPingParams;
}

export interface VertoPongMessage extends VertoMethodMessage<VertoPongParams> {
  method: 'verto.pong';
  params: VertoPongParams;
}

export interface VertoInviteMessage extends VertoMethodMessage<VertoInviteParams> {
  method: 'verto.invite';
  params: VertoInviteParams;
}

export interface VertoByeMessage extends VertoMethodMessage<VertoByeParams> {
  method: 'verto.bye';
  params: VertoByeParams;
}

export interface VertoByeInboundMessage extends VertoMethodMessage<VertoByeInboundParams> {
  method: 'verto.bye';
  params: VertoByeInboundParams;
}

export interface VertoAttachMessage extends VertoMethodMessage<VertoAttachParams> {
  method: 'verto.attach';
  params: VertoAttachParams;
}

export interface VertoAnswerResultMessage extends VertoMethodMessage {
  result: VertoAnswerResultParams;
}

export type InboundVertoMessage =
  | VertoAnswerMessage
  | VertoMediaMessage
  | VertoMediaParamsMessage
  | VertoPingMessage
  | VertoByeInboundMessage;

export type OutboundVertoMessage =
  | VertoInviteMessage
  | VertoByeMessage
  | VertoPongMessage
  | VertoAnswerResultMessage;
