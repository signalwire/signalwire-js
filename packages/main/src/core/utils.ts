import { filter, NEVER, Observable, race, take } from 'rxjs';
import { v4 as uuid } from 'uuid';

import { InvalidListenerError, JSONRPCError, RPCTimeoutError } from './errors';
import { Destroyable } from '../behaviors/Destroyable';
import { getLogger } from '../utils/logger';

import type { RPCConnectResult } from './RPCMessages';
import type { JSONRPCRequest, JSONRPCResponse } from './RPCMessages/types/base';

const logger = getLogger();

export async function callListener<T>(
  listener: ((value: T) => void) | ((value: T) => Promise<void>),
  value: T,
  onError?: (error: unknown) => void
): Promise<void> {
  try {
    if (typeof listener !== 'function') {
      throw new InvalidListenerError();
    }
    await listener(value);
  } catch (error) {
    if (error instanceof InvalidListenerError) {
      logger.error(error.message);
    } else {
      logger.warn('Error calling listener:', error);
    }
    onError?.(error);
  }
}

export const isRPCConnectResult = (e: unknown): e is RPCConnectResult => {
  logger.debug('isRPCConnectResult check:', e);
  if (!e || typeof e !== 'object') return false;

  // Check if this is a JSON-RPC response with a result property

  const result = e as RPCConnectResult;

  const is =
    typeof result.identity === 'string' &&
    typeof result.protocol === 'string' &&
    typeof result.authorization === 'object' &&
    typeof result.authorization.jti === 'string' &&
    typeof result.authorization.project_id === 'string' &&
    typeof result.authorization.fabric_subscriber === 'object';

  logger.debug('isRPCConnectResult check result:', is);
  return is;
};

export interface PendingRPCOptions {
  /**
   * Timeout in milliseconds. Defaults to 5000ms (5 seconds).
   * If the response is not received within this time, the promise will reject with RPCTimeoutError.
   */
  timeoutMs?: number;

  /**
   * Optional AbortSignal for cancellation support.
   * If the signal is aborted, the promise will reject with an AbortError.
   */
  signal?: AbortSignal;
}

export class PendingRPC<T extends JSONRPCResponse = JSONRPCResponse> {
  private static readonly defaultTimeoutMs = 5000;
  private id = uuid();

  public readonly request: JSONRPCRequest;
  public promise: Promise<T>;

  constructor(request: JSONRPCRequest, responses$: Observable<T>, options?: PendingRPCOptions) {
    logger.debug(
      `[PendingRPC(${this.id}) request:${request.id}: method:${request.method}] Creating PendingRPC`
    );
    this.request = request;

    const timeoutMs = options?.timeoutMs ?? PendingRPC.defaultTimeoutMs;
    const signal = options?.signal;

    this.promise = new Promise<T>((resolve, reject) => {
      // Check if already aborted
      if (signal?.aborted) {
        reject(new DOMException('The operation was aborted', 'AbortError'));
        return;
      }

      // Track if promise has been settled to prevent unhandled rejections
      let isSettled = false;

      // Create the main response observable
      const response$ = responses$.pipe(
        filter((result) => result.id === request.id),
        take(1)
      );

      // Create timeout observable
      const timeout$ = new Observable<never>((subscriber) => {
        const timer = setTimeout(() => {
          subscriber.error(new RPCTimeoutError(request.id, timeoutMs));
        }, timeoutMs);

        return () => clearTimeout(timer);
      });

      // Create abort observable if signal provided
      const abort$ = signal
        ? new Observable<never>((subscriber) => {
            const abortHandler = () => {
              subscriber.error(new DOMException('The operation was aborted', 'AbortError'));
            };
            signal.addEventListener('abort', abortHandler);

            return () => signal.removeEventListener('abort', abortHandler);
          })
        : NEVER; // Observable that never emits

      // Race between response, timeout, and abort
      const subscription = race(response$, timeout$, abort$).subscribe({
        next: (response) => {
          isSettled = true;
          if (response.error) {
            const rpcError = new JSONRPCError(
              response.error.code,
              response.error.message,
              response.error.data,
              undefined,
              request.id
            );
            logger.debug(
              `[PendingRPC(${this.id}) request:${request.id}] Rejecting promise with RPC error:`,
              rpcError
            );
            reject(rpcError);
          } else {
            logger.debug(
              `[PendingRPC(${this.id}) request:${request.id}] Resolving promise with response:`,
              response
            );
            resolve(response);
          }
          subscription.unsubscribe();
        },
        error: (error) => {
          logger.debug(
            `[PendingRPC(${this.id}) request:${request.id}] Rejecting promise with error:`,
            error
          );
          isSettled = true;
          reject(error as Error);
          subscription.unsubscribe();
        },
        complete: () => {
          logger.debug(`[PendingRPC(${this.id}) request:${request.id}] Observable completed`);
          if (!isSettled) {
            reject(new RPCTimeoutError(request.id, timeoutMs));
          }
          subscription.unsubscribe();
        }
      });
    });
  }

  // Make it thenable (Promise-like)
  async then<TResult1 = JSONRPCResponse, TResult2 = never>(
    onfulfilled?: ((value: JSONRPCResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.promise.then(onfulfilled, onrejected);
  }

  async catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null
  ): Promise<JSONRPCResponse | TResult> {
    return this.promise.catch(onrejected);
  }

  async finally(onfinally?: (() => void) | null): Promise<JSONRPCResponse> {
    return this.promise.finally(onfinally);
  }
}

// Re-export Destroyable for backward compatibility
export { Destroyable };
