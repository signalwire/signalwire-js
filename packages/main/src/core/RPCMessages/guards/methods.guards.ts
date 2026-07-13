// =============================================================================
// CLIENT/SERVER METHOD TYPE GUARDS
// =============================================================================
// This file contains type guards for client requests, server responses,
// and method params/results.

import { isJSONRPCRequest } from './base.guards';

import type { SignalwirePingRequest } from '../types/events';

export function isSignalwirePingRequest(value: unknown): value is SignalwirePingRequest {
  return isJSONRPCRequest(value) && value.method === 'signalwire.ping';
}
