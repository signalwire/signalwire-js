import { getValueFrom } from './getValueFrom';

import type { JSONRPCResponse } from '../core/RPCMessages/types/base';

/**
 * Unwrap a method's own reply from a `webrtc.verto` envelope.
 *
 * A control verb sent in-dialog comes back nested two levels deep:
 *
 * ```
 * { result: { node_id, code, result: { jsonrpc, id, result: <method payload> } } }
 * ```
 *
 * whereas the routed transport resolves the method payload directly under
 * `.result`. Readers want the latter shape, and the difference is silent when it
 * is wrong — `response.result.layouts` simply evaluates to `undefined` against the
 * envelope, so the data arrives, nothing throws, and the caller sees an empty
 * value. That exact failure produced an empty layout dropdown with a successful
 * request behind it.
 *
 * Accepting both shapes here keeps every reader indifferent to which transport
 * produced the response. Anything that is not a nested envelope (a plain ack, or
 * an already-unwrapped reply) passes through untouched.
 */
export function unwrapVertoReply<T extends JSONRPCResponse = JSONRPCResponse>(
  response: unknown
): T {
  const inner = getValueFrom<JSONRPCResponse>(response, 'result.result');
  return (inner && typeof inner === 'object' && 'result' in inner ? inner : response) as T;
}
