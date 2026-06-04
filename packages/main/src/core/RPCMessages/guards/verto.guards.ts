// =============================================================================
// VERTO TYPE GUARDS
// =============================================================================
// This file contains type guards for Verto protocol types.

import { hasProperty, isObject } from './base.guards';

import type { VertoMethod } from '../../types/rpc.types';
import type { TypeGuard } from '../types/base';
import type { WebrtcMessagePayload } from '../types/events';
import type {
  VertoAnswerMessage,
  VertoAnswerParams,
  VertoAnswerResultMessage,
  VertoAttachMessage,
  VertoAttachParams,
  VertoByeMessage,
  VertoByeParams,
  VertoInviteMessage,
  VertoInviteParams,
  VertoMediaMessage,
  VertoMediaParams,
  VertoMediaParamsMessage,
  VertoMediaParamsParams,
  VertoMethodMessage,
  VertoPingMessage,
  VertoPingParams,
  VertoPongMessage,
  VertoPongParams
} from '../types/verto';

// =============================================================================
// VERTO MESSAGE TYPE GUARDS
// =============================================================================

export function isVertoMethodMessage(value: unknown): value is VertoMethodMessage {
  return (
    isObject(value) &&
    hasProperty(value, 'jsonrpc') &&
    value.jsonrpc === '2.0' &&
    hasProperty(value, 'id')
  );
}

export function isVertoAnswerMessage(value: unknown): value is VertoAnswerMessage {
  if (!isVertoMethodMessage(value)) return false;
  const msg = value as unknown as Record<string, unknown>;
  return msg.method === 'verto.answer' && isObject(msg.params) && hasProperty(msg.params, 'callID');
}

export function isVertoMediaMessage(value: unknown): value is VertoMediaMessage {
  if (!isVertoMethodMessage(value)) return false;
  const msg = value as unknown as Record<string, unknown>;
  return (
    msg.method === 'verto.media' &&
    isObject(msg.params) &&
    hasProperty(msg.params, 'callID') &&
    hasProperty(msg.params, 'sdp')
  );
}

export function isVertoMediaParamsMessage(value: unknown): value is VertoMediaParamsMessage {
  if (!isVertoMethodMessage(value)) return false;
  const msg = value as unknown as Record<string, unknown>;
  return (
    msg.method === 'verto.mediaParams' &&
    isObject(msg.params) &&
    hasProperty(msg.params, 'mediaParams')
  );
}

export function isVertoPingMessage(value: unknown): value is VertoPingMessage {
  if (!isVertoMethodMessage(value)) return false;
  const msg = value as unknown as Record<string, unknown>;
  return msg.method === 'verto.ping';
}

export function isVertoPongMessage(value: unknown): value is VertoPongMessage {
  if (!isVertoMethodMessage(value)) return false;
  const msg = value as unknown as Record<string, unknown>;
  return msg.method === 'verto.pong';
}

export function isVertoInviteMessage(value: unknown): value is VertoInviteMessage {
  if (!isVertoMethodMessage(value)) return false;
  const msg = value as unknown as Record<string, unknown>;
  return (
    msg.method === 'verto.invite' &&
    isObject(msg.params) &&
    hasProperty(msg.params, 'sdp') &&
    hasProperty(msg.params, 'callID')
  );
}

export function isVertoByeMessage(value: unknown): value is VertoByeMessage {
  if (!isVertoMethodMessage(value)) return false;
  const msg = value as unknown as Record<string, unknown>;
  return msg.method === 'verto.bye';
}

export function isVertoAnswerResultMessage(value: unknown): value is VertoAnswerResultMessage {
  if (!isVertoMethodMessage(value)) return false;
  const msg = value as unknown as Record<string, unknown>;
  return (
    isObject(msg.result) &&
    hasProperty(msg.result, 'method') &&
    msg.result.method === 'verto.answer'
  );
}

export function isVertoAttachMessage(value: unknown): value is VertoAttachMessage {
  if (!isVertoMethodMessage(value)) return false;
  const msg = value as unknown as Record<string, unknown>;
  return msg.method === 'verto.attach';
}

// =============================================================================
// WEBRTC MESSAGE EVENT DATA (inner params.params) TYPE GUARDS
// =============================================================================

export function isVertoAnswerInnerParams(value: unknown): value is WebrtcMessagePayload & {
  method: 'verto.answer';
  params: VertoAnswerParams;
} {
  return (
    isObject(value) &&
    hasProperty(value, 'jsonrpc') &&
    value.jsonrpc === '2.0' &&
    hasProperty(value, 'method') &&
    value.method === 'verto.answer' &&
    isObject(value.params) &&
    hasProperty(value.params, 'callID')
  );
}

export function isVertoMediaInnerParams(value: unknown): value is WebrtcMessagePayload & {
  method: 'verto.media';
  params: VertoMediaParams;
} {
  return (
    isObject(value) &&
    hasProperty(value, 'jsonrpc') &&
    value.jsonrpc === '2.0' &&
    hasProperty(value, 'method') &&
    value.method === 'verto.media' &&
    isObject(value.params) &&
    hasProperty(value.params, 'callID') &&
    hasProperty(value.params, 'sdp')
  );
}

export function isVertoMediaParamsInnerParams(value: unknown): value is WebrtcMessagePayload & {
  method: 'verto.mediaParams';
  params: VertoMediaParamsParams;
} {
  return (
    isObject(value) &&
    hasProperty(value, 'jsonrpc') &&
    value.jsonrpc === '2.0' &&
    hasProperty(value, 'method') &&
    value.method === 'verto.mediaParams' &&
    isObject(value.params) &&
    hasProperty(value.params, 'mediaParams')
  );
}

export function isVertoPingInnerParams(value: unknown): value is WebrtcMessagePayload & {
  method: 'verto.ping';
  params: VertoPingParams;
} {
  return (
    isObject(value) &&
    hasProperty(value, 'jsonrpc') &&
    value.jsonrpc === '2.0' &&
    hasProperty(value, 'method') &&
    value.method === 'verto.ping'
  );
}

// =============================================================================
// VERTO PARAMS TYPE GUARDS (for use with filterAs on Verto method params)
// =============================================================================

export function isVertoAnswerParamsGuard(value: unknown): value is VertoAnswerParams {
  return isObject(value) && hasProperty(value, 'callID') && typeof value.callID === 'string';
}

export function isVertoMediaSdpParamsGuard(value: unknown): value is VertoMediaParams {
  return (
    isObject(value) &&
    hasProperty(value, 'callID') &&
    typeof value.callID === 'string' &&
    hasProperty(value, 'sdp') &&
    typeof value.sdp === 'string'
  );
}

export function isVertoMediaParamsParamsGuard(value: unknown): value is VertoMediaParamsParams {
  return (
    isObject(value) &&
    hasProperty(value, 'callID') &&
    typeof value.callID === 'string' &&
    hasProperty(value, 'mediaParams') &&
    isObject(value.mediaParams)
  );
}

export function isVertoPingParamsGuard(value: unknown): value is VertoPingParams {
  return (
    isObject(value) &&
    hasProperty(value, 'callID') &&
    typeof value.callID === 'string' &&
    hasProperty(value, 'dialogParams') &&
    isObject(value.dialogParams)
  );
}

export function isVertoPongParamsGuard(value: unknown): value is VertoPongParams {
  return isVertoPingParamsGuard(value);
}

export function isVertoInviteParamsGuard(value: unknown): value is VertoInviteParams {
  return (
    isObject(value) &&
    hasProperty(value, 'dialogParams') &&
    isObject(value.dialogParams) &&
    hasProperty(value, 'sdp') &&
    typeof value.sdp === 'string'
  );
}

export function isVertoByeParamsGuard(value: unknown): value is VertoByeParams {
  return (
    isObject(value) &&
    hasProperty(value, 'callID') &&
    typeof value.callID === 'string' &&
    hasProperty(value, 'cause') &&
    typeof value.cause === 'string'
  );
}

export function isVertoAttachParamsGuard(value: unknown): value is VertoAttachParams {
  return (
    isObject(value) &&
    hasProperty(value, 'callID') &&
    typeof value.callID === 'string' &&
    hasProperty(value, 'callee_id_number') &&
    typeof value.callee_id_number === 'string' &&
    hasProperty(value, 'callee_id_name') &&
    typeof value.callee_id_name === 'string' &&
    hasProperty(value, 'caller_id_number') &&
    typeof value.caller_id_number === 'string' &&
    hasProperty(value, 'caller_id_name') &&
    typeof value.caller_id_name === 'string'
  );
}

// =============================================================================
// VERTO METHOD TYPE MAPPING
// =============================================================================

export const VertoMethodTypeMap = {
  'verto.answer': isVertoAnswerMessage,
  'verto.media': isVertoMediaMessage,
  'verto.mediaParams': isVertoMediaParamsMessage,
  'verto.ping': isVertoPingMessage,
  'verto.pong': isVertoPongMessage,
  'verto.invite': isVertoInviteMessage,
  'verto.bye': isVertoByeMessage
} as const satisfies Partial<Record<VertoMethod, TypeGuard<VertoMethodMessage>>>;

export type VertoMethodType = keyof typeof VertoMethodTypeMap;

/**
 * Gets the appropriate type guard for a Verto method.
 */
export function getVertoMethodGuard(method: string): TypeGuard<VertoMethodMessage> | undefined {
  return VertoMethodTypeMap[method as VertoMethodType];
}

// =============================================================================
// VERTO PARAMS TYPE MAPPING
// =============================================================================

export const VertoParamsTypeMap = {
  'verto.answer': isVertoAnswerParamsGuard,
  'verto.media': isVertoMediaSdpParamsGuard,
  'verto.mediaParams': isVertoMediaParamsParamsGuard,
  'verto.ping': isVertoPingParamsGuard,
  'verto.pong': isVertoPongParamsGuard,
  'verto.invite': isVertoInviteParamsGuard,
  'verto.attach': isVertoAttachParamsGuard,
  'verto.bye': isVertoByeParamsGuard
} as const satisfies Partial<Record<VertoMethod, TypeGuard<unknown>>>;

/**
 * Gets the appropriate params type guard for a Verto method.
 */
export function getVertoParamsGuard(
  method: string
):
  | TypeGuard<
      | VertoAnswerParams
      | VertoMediaParams
      | VertoMediaParamsParams
      | VertoPingParams
      | VertoPongParams
      | VertoInviteParams
      | VertoByeParams
      | VertoAttachParams
    >
  | undefined {
  return VertoParamsTypeMap[method as VertoMethodType];
}
