export class UnexpectedError extends Error {
  constructor(
    public at?: string,
    options?: ErrorOptions
  ) {
    super(`Unexpected Error${at ? ` at ${at}` : ''}`, options);
    this.name = 'UnexpectedError';
  }
}

export class UnimplementedError extends Error {
  constructor(
    public reason = 'Not Implemented',
    options?: ErrorOptions
  ) {
    super(reason, options);
    this.name = 'UnimplementedError';
  }
}

export class NotConnectedError extends Error {
  constructor(
    public reason = 'Not Connected',
    options?: ErrorOptions
  ) {
    super(reason, options);
    this.name = 'NotConnectedError';
  }
}

export class InvalidCredentialsError extends Error {
  constructor(
    public reason = 'Invalid Credentials',
    options?: ErrorOptions
  ) {
    super(reason, options);
    this.name = 'InvalidCredentialsError';
  }
}

export class WebSocketConnectionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'WebSocketConnectionError';
  }
}

export class TransportConnectionError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'TransportConnectionError';
  }
}

export class WebSocketTimeoutError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'WebSocketTimeoutError';
  }
}

export class RequestTimeoutError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'RequestTimeoutError';
  }
}

export class RequestError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'RequestError';
  }
}

export class InvalidListenerError extends Error {
  constructor(options?: ErrorOptions) {
    super('listener is not a function', options);
    this.name = 'InvalidListenerError';
  }
}

export class RPCTimeoutError extends Error {
  constructor(
    public requestId: string,
    public timeoutMs: number,
    options?: ErrorOptions
  ) {
    super(`RPC request ${requestId} timed out after ${timeoutMs}ms`, options);
    this.name = 'RPCTimeoutError';
  }
}

export class AuthStateHandlerError extends Error {
  constructor(
    public error: unknown = null,
    options?: ErrorOptions
  ) {
    super('Error handling authorization state update', {
      ...options,
      cause: options?.cause ?? (error instanceof Error ? error : undefined)
    });
    this.name = 'AuthStateHandlerError';
  }
}

export class InvalidStateTransitionError extends Error {
  constructor(
    public currentState: string,
    public targetState: string,
    options?: ErrorOptions
  ) {
    super(
      `Invalid transition: cannot transition from "${currentState}" to "${targetState}"`,
      options
    );
    this.name = 'InvalidStateTransitionError';
  }
}

export class InvalidOptionError extends Error {
  constructor(
    public value: string,
    public availableOptions: string[],
    options?: ErrorOptions
  ) {
    super(
      `Invalid option: "${value}" must be one of the available options: ${availableOptions.join(', ')}`,
      options
    );
    this.name = 'InvalidOptionError';
  }
}

export class StorageNotAvailableError extends Error {
  constructor(
    public storageType: string = 'localStorage',
    options?: ErrorOptions
  ) {
    super(`${storageType} is not available in this environment`, options);
    this.name = 'StorageNotAvailableError';
  }
}

export class SerializationError extends Error {
  constructor(
    public key: string,
    public originalError: Error
  ) {
    super(`Failed to serialize value for key "${key}": ${originalError.message}`, {
      cause: originalError
    });
    this.name = 'SerializationError';
  }
}

export class DeserializationError extends Error {
  constructor(
    public key: string,
    public originalError: Error
  ) {
    super(`Failed to deserialize value for key "${key}": ${originalError.message}`, {
      cause: originalError
    });
    this.name = 'DeserializationError';
  }
}

export class StorageWriteError extends Error {
  constructor(
    public key: string,
    public originalError: Error
  ) {
    super(`Failed to write to storage for key "${key}": ${originalError.message}`, {
      cause: originalError
    });
    this.name = 'StorageWriteError';
  }
}

export class StorageReadError extends Error {
  constructor(
    public key: string,
    public originalError: Error
  ) {
    super(`Failed to read from storage "${key}": ${originalError.message}`, {
      cause: originalError
    });
    this.name = 'StorageReadError';
  }
}

export class InvalidStorageValueError extends Error {
  constructor(
    public key: string,
    public valueType: string,
    options?: ErrorOptions
  ) {
    super(
      `Cannot serialize value of type "${valueType}" for key "${key}": This type cannot be serialized to JSON`,
      options
    );
    this.name = 'InvalidStorageValueError';
  }
}

export class DependencyError extends Error {
  constructor(
    public description: string,
    options?: ErrorOptions
  ) {
    super(`Dependency ${description} is not set or available.`, options);
    this.name = 'DependencyError';
  }
}

export class DeviceNotFoundError extends Error {
  constructor(
    public message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'DeviceNotFoundError';
  }
}

// =============================================================================
// CALL ERROR TYPES
// =============================================================================

/**
 * Semantic category of a call-lifecycle error.
 *
 * - `'media'`     – RTCPeerConnection / media device failure
 * - `'signaling'` – Verto / JSON-RPC protocol error
 * - `'timeout'`   – Call setup timed out waiting for a response
 * - `'rejected'`  – Remote side rejected the call
 * - `'network'`   – Transport lost during an active call
 * - `'internal'`  – Unexpected / unknown error
 */
export type CallErrorKind = 'media' | 'signaling' | 'timeout' | 'rejected' | 'network' | 'internal';

/**
 * Structured error emitted on `call.errors$`.
 *
 * Provides actionable metadata so consumers can react without
 * resorting to `instanceof` checks on raw `Error` objects.
 */
export interface CallError {
  /** Semantic category of the error. */
  readonly kind: CallErrorKind;
  /**
   * Whether the error terminates the call.
   * When `true`, the call will automatically transition to `'failed'`
   * and be destroyed — no further action is needed from the consumer.
   */
  readonly fatal: boolean;
  /** The underlying error. */
  readonly error: Error;
  /** ID of the call that produced this error. */
  readonly callId: string;
}

export class CallCreateError extends Error {
  constructor(
    public message: string,
    public error: unknown = null,
    public direction: 'inbound' | 'outbound' = 'outbound',
    options?: ErrorOptions
  ) {
    super(message, {
      ...options,
      cause: options?.cause ?? (error instanceof Error ? error : undefined)
    });
    this.name = 'CallCreateError';
  }
}

export class JSONRPCError extends Error {
  constructor(
    public code: number | string,
    message: string,
    public data?: unknown,
    options?: ErrorOptions,
    public requestId?: string
  ) {
    super(message, options);
    this.name = 'JSONRPCError';
  }
}

export class InvalidParams extends Error {
  constructor(
    public message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'InvalidParams';
  }
}

export class ConversationError extends Error {
  constructor(
    public message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'ConversationError';
  }
}

export class VertoInviteHandlerError extends Error {
  constructor(
    public error: unknown = null,
    options?: ErrorOptions
  ) {
    super('Error handling Verto invite', {
      ...options,
      cause: options?.cause ?? (error instanceof Error ? error : undefined)
    });
    this.name = 'VertoInviteHandlerError';
  }
}

export class VertoAttachHandlerError extends Error {
  constructor(
    public error: unknown = null,
    options?: ErrorOptions
  ) {
    super('Error handling Verto attach', {
      ...options,
      cause: options?.cause ?? (error instanceof Error ? error : undefined)
    });
    this.name = 'VertoAttachHandlerError';
  }
}

export class HttpRequestError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'HttpRequestError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ValidationError';
  }
}

export class VertoPongError extends Error {
  constructor(public originalError: unknown) {
    super('Failed to send Verto pong - call may disconnect', {
      cause: originalError instanceof Error ? originalError : undefined
    });
    this.name = 'VertoPongError';
  }
}

export class MessageParseError extends Error {
  constructor(public originalError: unknown) {
    super('Failed to parse incoming WebSocket message', {
      cause: originalError instanceof Error ? originalError : undefined
    });
    this.name = 'MessageParseError';
  }
}

export class CollectionFetchError extends Error {
  constructor(
    public operation: string,
    public originalError: unknown
  ) {
    super(`Collection fetch failed during ${operation}`, {
      cause: originalError instanceof Error ? originalError : undefined
    });
    this.name = 'CollectionFetchError';
  }
}

export class MediaTrackError extends Error {
  constructor(
    public operation: string,
    public kind: string,
    public originalError: unknown
  ) {
    super(`Media track ${operation} failed for ${kind}`, {
      cause: originalError instanceof Error ? originalError : undefined
    });
    this.name = 'MediaTrackError';
  }
}

// =============================================================================
// DPOP / CLIENT BOUND SAT ERROR TYPES
// =============================================================================

export class DPoPInitError extends Error {
  constructor(
    public originalError: unknown,
    message = 'Failed to initialize DPoP key pair'
  ) {
    super(message, {
      cause: originalError instanceof Error ? originalError : undefined
    });
    this.name = 'DPoPInitError';
  }
}

// =============================================================================
// RESILIENCE ERROR TYPES
// =============================================================================

/**
 * Error thrown when a recovery attempt fails.
 *
 * Carries the recovery action and attempt number for diagnostic purposes.
 */
export class RecoveryError extends Error {
  constructor(
    public action: string,
    public attempt: number,
    public originalError?: unknown
  ) {
    super(`Recovery failed: ${action} (attempt ${attempt})`, {
      cause: originalError instanceof Error ? originalError : undefined
    });
    this.name = 'RecoveryError';
  }
}

/**
 * Error thrown when getUserMedia fails with OverconstrainedError
 * and all fallback levels have been exhausted.
 */
export class OverconstrainedFallbackError extends Error {
  constructor(
    public deviceKind: string,
    public originalError?: unknown
  ) {
    super(`All constraint fallback levels exhausted for ${deviceKind}`, {
      cause: originalError instanceof Error ? originalError : undefined
    });
    this.name = 'OverconstrainedFallbackError';
  }
}

/**
 * Error thrown when the preflight connectivity test fails.
 */
export class PreflightError extends Error {
  constructor(
    public phase: string,
    public originalError?: unknown
  ) {
    super(`Preflight test failed during ${phase}`, {
      cause: originalError instanceof Error ? originalError : undefined
    });
    this.name = 'PreflightError';
  }
}

// =============================================================================
// DPOP / CLIENT BOUND SAT ERROR TYPES
// =============================================================================

export class DeviceTokenError extends Error {
  constructor(
    message: string,
    public originalError?: unknown
  ) {
    super(message, {
      cause: originalError instanceof Error ? originalError : undefined
    });
    this.name = 'DeviceTokenError';
  }
}

export class TokenRefreshError extends Error {
  constructor(
    message: string,
    public originalError?: unknown
  ) {
    super(message, {
      cause: originalError instanceof Error ? originalError : undefined
    });
    this.name = 'TokenRefreshError';
  }
}
