import { CallEventsManager } from './CallEventsManager';
import { WebRTCVertoManager } from './VertoManager';
import {
  RPC_ERROR_AUTHENTICATION_FAILED,
  RPC_ERROR_INVALID_PARAMS,
  RPC_ERROR_REQUESTER_VALIDATION_FAILED
} from '../core/constants';
import { WebRTCCall } from '../core/entities/Call';
import {
  JSONRPCError,
  MediaAccessError,
  MediaTrackError,
  RPCTimeoutError,
  TransportConnectionError,
  VertoPongError,
  WebSocketConnectionError
} from '../core/errors';

import type { AttachManager } from './AttachManager';
import type { NetworkChangeEvent } from '../controllers/NetworkMonitor';
import type { Address } from '../core/entities/Address';
import type { CallOptions } from '../core/entities/types/call.types';
import type { CallError } from '../core/errors';
import type { WebRTCApiProvider } from '../dependencies/interfaces';
import type { ClientSession } from '../interfaces/ClientSession';
import type { DeviceController } from '../interfaces/DeviceController';
import type { Observable } from 'rxjs';

/**
 * Infers the semantic error category from a raw Error thrown by VertoManager
 * or an RTCPeerConnection layer.
 */
function inferCallErrorKind(error: Error): CallError['kind'] {
  if (error instanceof RPCTimeoutError) return 'timeout';
  if (error instanceof JSONRPCError) return 'signaling';
  if (error instanceof MediaTrackError) return 'media';
  if (error instanceof MediaAccessError) return 'media';
  if (error instanceof WebSocketConnectionError || error instanceof TransportConnectionError)
    return 'network';
  return 'internal';
}

/** JSON-RPC error codes that ClientSessionManager treats as recoverable at the
 * session level. Surfacing one of these against an in-flight call should not
 * destroy the call, because the session will reauthenticate and any pending
 * RPC can then be retried. */
const RECOVERABLE_RPC_CODES = new Set<number | string>([
  RPC_ERROR_REQUESTER_VALIDATION_FAILED,
  RPC_ERROR_AUTHENTICATION_FAILED,
  RPC_ERROR_INVALID_PARAMS
]);

/** Determines whether an error should be fatal (destroy the call). */
function isFatalError(error: Error): boolean {
  // Transient signaling issues — the call may survive
  if (error instanceof VertoPongError) return false;
  // Media device errors degrade quality but don't end the call
  if (error instanceof MediaTrackError) return false;
  // Local media acquisition failures: the wrapping site knows whether the
  // call can continue (receive-only fallback, aux connection) and sets fatal.
  if (error instanceof MediaAccessError) return error.fatal;
  // RPC timeouts during active calls are transient (network outage) — recovery may retry
  if (error instanceof RPCTimeoutError) return false;
  // JSONRPCError covers both hard signaling failures and transient auth-recoverable
  // errors. Inspect the code so the latter don't destroy the call when the session
  // is already set up to self-heal them.
  if (error instanceof JSONRPCError && RECOVERABLE_RPC_CODES.has(error.code)) return false;
  // All other errors (JSONRPCError on invite with a fatal code, connection failures, etc.)
  return true;
}

/**
 * Factory for creating WebRTCCall instances with proper manager wiring.
 * Eliminates circular dependencies by centralizing Call and Manager creation.
 */
export class CallFactory {
  constructor(
    private sessionManager: ClientSession,
    private deviceController: DeviceController,
    private attachManager: AttachManager,
    private webRTCApiProvider: WebRTCApiProvider,
    private networkChange$?: Observable<NetworkChangeEvent>
  ) {}

  /**
   * Create a new WebRTCCall with properly initialized managers
   */
  createCall(address: Address | undefined, options: CallOptions): WebRTCCall {
    const call = new WebRTCCall(
      this.sessionManager,
      options,
      {
        initializeManagers: (callInstance: WebRTCCall) => {
          const vertoManager = new WebRTCVertoManager(
            callInstance,
            this.attachManager,
            this.deviceController,
            this.webRTCApiProvider,
            {
              nodeId: options.nodeId,
              onError: (error: Error, options?: { fatal?: boolean }) => {
                const callError: CallError = {
                  kind: inferCallErrorKind(error),
                  fatal: options?.fatal ?? isFatalError(error),
                  error,
                  callId: callInstance.id
                };
                callInstance.emitError(callError);
              },
              onModifyFailed: () => {
                callInstance.notifyModifyFailed();
              }
            }
          );

          const callEventsManager = new CallEventsManager(callInstance);

          return {
            vertoManager,
            callEventsManager
          };
        },
        deviceController: this.deviceController,
        networkChange$: this.networkChange$
      },
      address
    );

    return call;
  }
}
