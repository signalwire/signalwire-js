import {
  RPC_ERROR_AUTHENTICATION_FAILED,
  RPC_ERROR_REQUESTER_VALIDATION_FAILED
} from '../core/constants';
import { JSONRPCError } from '../core/errors';

/**
 * Walk an error's `error`/`cause` chain looking for a {@link JSONRPCError}.
 * Errors thrown by call creation are wrapped (e.g. `CallCreateError`), so the
 * underlying signaling error is nested. Bounded by a visited set to guard
 * against cyclic causes.
 */
export function findJSONRPCError(error: unknown): JSONRPCError | undefined {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current instanceof Error && !seen.has(current)) {
    seen.add(current);
    if (current instanceof JSONRPCError) {
      return current;
    }
    current = (current as { error?: unknown }).error ?? current.cause;
  }
  return undefined;
}

/**
 * Whether an error is a session-recoverable authentication failure
 * (`-32002` authentication failed or `-32003` requester validation failed)
 * that a credential re-mint + retry can heal.
 */
export function isRecoverableAuthError(error: unknown): boolean {
  const rpcError = findJSONRPCError(error);
  return (
    rpcError !== undefined &&
    (rpcError.code === RPC_ERROR_REQUESTER_VALIDATION_FAILED ||
      rpcError.code === RPC_ERROR_AUTHENTICATION_FAILED)
  );
}

/**
 * Whether an error is specifically a requester-validation rejection
 * (`-32003`) — the server refusing the session's credential.
 *
 * Narrower than {@link isRecoverableAuthError} on purpose. `-32002` is
 * overloaded server-side: a rejected reattach arrives as `-32002` with
 * `cause: INVALID_MSG_UNSPECIFIED` and message `CALL ERROR`, which is a
 * call-level rejection and says nothing about the credential. Use this where
 * the decision must not be fooled by that, such as deciding whether retrying
 * an operation could possibly succeed.
 */
export function isRequesterValidationError(error: unknown): boolean {
  return findJSONRPCError(error)?.code === RPC_ERROR_REQUESTER_VALIDATION_FAILED;
}
