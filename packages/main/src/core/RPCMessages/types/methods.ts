// =============================================================================
// CLIENT/SERVER METHOD TYPES
// =============================================================================
// This file contains types for client requests, server responses, and
// method-specific params and results.

import type { JSONRPCRequest, JSONRPCSuccessResponse } from './base';
import type { VertoMethodMessage } from './verto';

// =============================================================================
// RESULT INTERFACES
// =============================================================================

export interface SignalwirePingResult {
  timestamp: number;
}

export interface CallLayoutListResult {
  layouts: string[];
  code: string;
  message: string;
}

// =============================================================================
// CLIENT REQUEST PARAMS INTERFACES
// =============================================================================

export interface WebrtcVertoParams<TVertoMessage = VertoMethodMessage> {
  message: TVertoMessage;
  callID?: string;
  node_id: string;
  subscribe?: string[];
}

// =============================================================================
// CLIENT REQUEST INTERFACES
// =============================================================================

export interface WebrtcVertoRequest<TVertoMessage = VertoMethodMessage> extends JSONRPCRequest<
  WebrtcVertoParams<TVertoMessage>
> {
  method: 'webrtc.verto';
  params: WebrtcVertoParams<TVertoMessage>;
}

// =============================================================================
// RESPONSE INTERFACES
// =============================================================================

export interface CallLayoutListResponse extends JSONRPCSuccessResponse<CallLayoutListResult> {
  result: CallLayoutListResult;
}
