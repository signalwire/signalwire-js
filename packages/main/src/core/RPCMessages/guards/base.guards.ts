// =============================================================================
// BASE TYPE GUARDS
// =============================================================================
// This file contains type guards for base JSON-RPC types.

import type { JSONRPCErrorResponse, JSONRPCRequest, JSONRPCResponse } from '../types/base';

// =============================================================================
// TYPE GUARD HELPERS
// =============================================================================

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function hasProperty<T extends object, K extends string>(
  obj: T,
  key: K
): obj is T & Record<K, unknown> {
  return key in obj;
}

export function hasStringProperty<T extends object, K extends string>(
  obj: T,
  key: K
): obj is T & Record<K, string> {
  return key in obj && typeof (obj as Record<string, unknown>)[key] === 'string';
}

// =============================================================================
// BASE TYPE GUARDS
// =============================================================================

export function isJSONRPCRequest(value: unknown): value is JSONRPCRequest {
  return (
    isObject(value) &&
    hasProperty(value, 'jsonrpc') &&
    value.jsonrpc === '2.0' &&
    hasProperty(value, 'id') &&
    typeof value.id === 'string' &&
    hasProperty(value, 'method') &&
    typeof value.method === 'string'
  );
}

export function isJSONRPCResponse(value: unknown): value is JSONRPCResponse {
  return (
    isObject(value) &&
    hasProperty(value, 'jsonrpc') &&
    value.jsonrpc === '2.0' &&
    hasProperty(value, 'id') &&
    typeof value.id === 'string' &&
    (hasProperty(value, 'result') || hasProperty(value, 'error'))
  );
}

export function isJSONRPCErrorResponse(value: unknown): value is JSONRPCErrorResponse {
  return (
    isObject(value) &&
    hasProperty(value, 'jsonrpc') &&
    value.jsonrpc === '2.0' &&
    hasProperty(value, 'id') &&
    typeof value.id === 'string' &&
    // Standard JSON-RPC error: has error field
    ((hasProperty(value, 'error') &&
      isObject(value.error) &&
      hasProperty(value.error, 'code') &&
      hasProperty(value.error, 'message')) ||
      (hasProperty(value, 'result') &&
        isObject(value.result) &&
        hasProperty(value.result, 'code') &&
        value.result.code !== '200' &&
        hasProperty(value.result, 'message')))
  );
}
