// =============================================================================
// BASE JSON-RPC INTERFACES
// =============================================================================
// This file contains the foundational JSON-RPC 2.0 types and utility types
// used throughout the SignalWire messaging protocol.

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type EventChannel = string | string[];

export type TypeGuard<T> = (value: unknown) => value is T;

// =============================================================================
// BASE JSON-RPC INTERFACES
// =============================================================================
export type JSONRPCVersion = '2.0';
export type JSONRPCMethod = string;

export interface JSONRPCRequest<TParams = unknown> {
  jsonrpc: JSONRPCVersion;
  id: string;
  method: JSONRPCMethod;
  params?: TParams;
}

export interface JSONRPCSuccessResponse<TResult = unknown> {
  jsonrpc: '2.0';
  id: string;
  result: TResult;
  error?: never;
}

export interface TError {
  code: string;
  message: string;
  data?: unknown;
}
export interface JSONRPCErrorResponse {
  jsonrpc: '2.0';
  id: string;
  result?: TError;
  error?: TError;
}

export type JSONRPCResponse<TResult = unknown> =
  | JSONRPCSuccessResponse<TResult>
  | JSONRPCErrorResponse;

// =============================================================================
// GENERIC PARAM/RESULT EXTRACTION TYPES
// =============================================================================

/**
 * Extracts the params type from any request type.
 * @example
 * type Params = ExtractParams<SignalwireConnectRequest>; // SignalwireConnectParams
 */
export type ExtractParams<T> = T extends { params: infer P } ? P : never;

/**
 * Extracts the result type from any response type.
 * @example
 * type Result = ExtractResult<SignalwireConnectResponse>; // SignalwireConnectResult
 */
export type ExtractResult<T> = T extends { result: infer R } ? R : never;
