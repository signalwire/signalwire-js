// =============================================================================
// CLIENT/SERVER METHOD TYPE GUARDS
// =============================================================================
// This file contains type guards for client requests, server responses,
// and method params/results.

import { hasProperty, isJSONRPCRequest, isJSONRPCResponse, isObject } from './base.guards';

import type { JSONRPCRequest, TypeGuard } from '../types/base';
import type { SignalwirePingParams, SignalwirePingRequest } from '../types/events';
import type {
  CallLayoutListRequest,
  CallLayoutListResponse,
  CallMuteParams,
  CallMuteRequest,
  CallMuteResponse,
  CallTargetParams,
  EmptyResponse,
  SignalwireConnectParams,
  SignalwireConnectRequest,
  SignalwireConnectResponse,
  SignalwirePingResponse,
  WebrtcVertoParams,
  WebrtcVertoRequest,
  WebrtcVertoResponse
} from '../types/methods';

// =============================================================================
// CLIENT REQUEST TYPE GUARDS
// =============================================================================

export function isSignalwireConnectRequest(value: unknown): value is SignalwireConnectRequest {
  return isJSONRPCRequest(value) && value.method === 'signalwire.connect';
}

export function isSignalwirePingRequest(value: unknown): value is SignalwirePingRequest {
  return isJSONRPCRequest(value) && value.method === 'signalwire.ping';
}

export function isWebrtcVertoRequest(value: unknown): value is WebrtcVertoRequest {
  return isJSONRPCRequest(value) && value.method === 'webrtc.verto';
}

export function isCallLayoutListRequest(value: unknown): value is CallLayoutListRequest {
  return isJSONRPCRequest(value) && value.method === 'call.layout.list';
}

export function isCallMuteRequest(value: unknown): value is CallMuteRequest {
  return isJSONRPCRequest(value) && value.method === 'call.mute';
}

// =============================================================================
// RESPONSE TYPE GUARDS
// =============================================================================

export function isSignalwireConnectResponse(value: unknown): value is SignalwireConnectResponse {
  return (
    isJSONRPCResponse(value) &&
    isObject(value.result) &&
    hasProperty(value.result, 'identity') &&
    hasProperty(value.result, 'authorization') &&
    hasProperty(value.result, 'protocol')
  );
}

export function isSignalwirePingResponse(value: unknown): value is SignalwirePingResponse {
  return (
    isJSONRPCResponse(value) && isObject(value.result) && hasProperty(value.result, 'timestamp')
  );
}

export function isWebrtcVertoResponse(value: unknown): value is WebrtcVertoResponse {
  return (
    isJSONRPCResponse(value) &&
    isObject(value.result) &&
    hasProperty(value.result, 'node_id') &&
    hasProperty(value.result, 'code')
  );
}

export function isCallLayoutListResponse(value: unknown): value is CallLayoutListResponse {
  return (
    isJSONRPCResponse(value) &&
    isObject(value.result) &&
    hasProperty(value.result, 'layouts') &&
    Array.isArray(value.result.layouts)
  );
}

export function isCallMuteResponse(value: unknown): value is CallMuteResponse {
  return (
    isJSONRPCResponse(value) &&
    isObject(value.result) &&
    hasProperty(value.result, 'code') &&
    hasProperty(value.result, 'message') &&
    !hasProperty(value.result, 'layouts') &&
    !hasProperty(value.result, 'node_id')
  );
}

export function isEmptyResponse(value: unknown): value is EmptyResponse {
  return (
    isJSONRPCResponse(value) && isObject(value.result) && Object.keys(value.result).length === 0
  );
}

// =============================================================================
// PARAMS TYPE GUARDS
// =============================================================================

export function isSignalwireConnectParams(value: unknown): value is SignalwireConnectParams {
  return (
    isObject(value) &&
    hasProperty(value, 'version') &&
    hasProperty(value, 'event_acks') &&
    hasProperty(value, 'agent') &&
    hasProperty(value, 'authentication')
  );
}

export function isSignalwirePingParams(value: unknown): value is SignalwirePingParams {
  return isObject(value) && hasProperty(value, 'timestamp') && typeof value.timestamp === 'number';
}

export function isWebrtcVertoParams(value: unknown): value is WebrtcVertoParams {
  return (
    isObject(value) &&
    hasProperty(value, 'message') &&
    hasProperty(value, 'callID') &&
    hasProperty(value, 'node_id')
  );
}

export function isCallTargetParams(value: unknown): value is CallTargetParams {
  return isObject(value) && hasProperty(value, 'self') && hasProperty(value, 'target');
}

export function isCallMuteParams(value: unknown): value is CallMuteParams {
  if (!isCallTargetParams(value)) return false;
  return 'channels' in value;
}

// =============================================================================
// METHOD TYPE MAPPING
// =============================================================================

export const MethodTypeMap = {
  'signalwire.connect': isSignalwireConnectRequest,
  'signalwire.ping': isSignalwirePingRequest,
  'webrtc.verto': isWebrtcVertoRequest,
  'call.layout.list': isCallLayoutListRequest,
  'call.mute': isCallMuteRequest
} as const;

export type MethodType = keyof typeof MethodTypeMap;

/**
 * Gets the appropriate type guard for a method.
 */
export function getMethodGuard(method: string): TypeGuard<JSONRPCRequest> | undefined {
  return MethodTypeMap[method as MethodType];
}
