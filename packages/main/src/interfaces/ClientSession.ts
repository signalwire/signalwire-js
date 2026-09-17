import type { JSONRPCRequest, JSONRPCResponse } from '../core/RPCMessages/types/base';
import type { PendingRPCOptions } from '../core/utils';
import type { Observable } from 'rxjs';

/**
 * Minimal interface for what Call needs from session management
 * need to interact with the session layer
 */
export interface ClientSession {
  /**
   * Execute an RPC request through the session transport
   * @param request - The JSON-RPC request to execute
   * @param options - Optional RPC execution options (timeout, etc.)
   * @returns Promise resolving to the RPC response
   */
  execute<T extends JSONRPCResponse = JSONRPCResponse>(
    request: JSONRPCRequest,
    options?: PendingRPCOptions
  ): Promise<T>;

  /**
   * Observable stream of incoming signaling events
   * Used by Call to listen for call-related events from the server
   */
  readonly signalingEvent$: Observable<Record<string, unknown>>;

  /**
   * ICE servers configuration for WebRTC peer connections
   * Used by VertoManager to configure RTCPeerConnection
   */
  readonly iceServers: RTCIceServer[] | undefined;

  /**
   * Emits true when the session is authenticated, false when not.
   * Used by Call to detect WebSocket reconnections (skip(1) + filter(true)
   * indicates a re-authentication after the initial connect).
   */
  readonly authenticated$: Observable<boolean>;

  /**
   * Control transport for every call in this session: `'routed'` (default) sends
   * call.* verbs on the client's session channel; `'in-dialog'` carries them on
   * each call's own signaling channel via `verto.info`. Set once as a client
   * config ({@link SignalWireOptions.callControl}) — it is session-wide, so a
   * reattached call reads it here rather than restoring it from persisted state.
   * Read by {@link Call.executeMethod}.
   */
  readonly callControl: 'routed' | 'in-dialog';
}
