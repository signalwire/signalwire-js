/** Persistence scope: browser `localStorage` or `sessionStorage`. */
export type StorageScope = 'local' | 'session';
/** Key-value storage interface for persisting SDK preferences and state. */
export interface Storage {
  setItem(key: string, value: string | null, scope: StorageScope): Promise<void>;
  getItem(key: string, scope: StorageScope): Promise<string | null>;
  removeItem(key: string, scope: StorageScope): Promise<void>;
  /** Clears all keys in the given scope. Implementations may scope the clear to SDK keys only. */
  clear(scope: StorageScope): Promise<void>;
}

import type { SDKCredential } from '../core/types/common.types.js';

/**
 * Context provided by the SDK when calling {@link CredentialProvider.authenticate}.
 *
 * Contains optional parameters the SDK generates internally (e.g., DPoP fingerprint)
 * that the implementor can forward to their server-side token endpoint.
 */
export interface AuthenticateContext {
  /**
   * JWK Thumbprint (RFC 7638) of the SDK's ephemeral DPoP key pair.
   *
   * When present, the implementor should forward this value as the `fingerprint`
   * parameter to the server-side SAT issuance endpoint alongside `scope: "sat:refresh"`.
   * This enables the server to bind the SAT to the SDK's key pair, allowing
   * automatic Client Bound SAT refresh without developer intervention.
   *
   * When absent (e.g., Web Crypto API not available), the implementor should
   * proceed without DPoP binding.
   */
  fingerprint?: string;
}

/**
 * Provides authentication credentials to the SDK.
 *
 * Implementors are responsible for:
 * - Obtaining credentials (e.g. via API calls, user login flows, or third-party auth services).
 * - Returning a valid {@link SDKCredential} with either a `token` or `authorizationState`.
 * - Setting `expiry_at` when the credential has a known expiration so the SDK can schedule refresh.
 * - Handling errors and never leaking sensitive data through error messages.
 *
 * ## Refresh precedence
 *
 * The SDK selects exactly one refresh mechanism per session, evaluated at connect
 * time (and re-evaluated on reconnect):
 *
 * | `refresh` provided | SAT carries `sat:refresh` scope | Active mechanism                     |
 * | ------------------ | -------------------------------- | ------------------------------------ |
 * | yes                | yes                              | Client Bound SAT (DPoP, internal)    |
 * | yes                | no                               | Developer-provided `refresh()`       |
 * | no                 | yes                              | Client Bound SAT (DPoP, internal)    |
 * | no                 | no                               | None — session ends at `expiry_at`   |
 *
 * When the SDK falls back to the developer-provided `refresh()` because the SAT
 * lacked `sat:refresh` scope, a `credential_refresh_fallback` event is emitted on
 * `SignalWire.warnings$` so application code can observe the transition.
 *
 * Mint a SAT via `POST /api/fabric/subscribers/tokens` with `fingerprint` and
 * `scope: ["sat:refresh"]` (both currently optional on that endpoint) to enable
 * the Client Bound SAT path; otherwise provide `refresh()` here.
 */
export interface CredentialProvider {
  /**
   * Obtains the initial credentials. Called once during client initialization.
   *
   * Implementor responsibilities:
   * - Resolve with a valid {@link SDKCredential} on success.
   * - Reject (throw) on failure — this will cause client initialization to fail.
   * - When `context.fingerprint` is provided, forward it to the server-side token
   *   endpoint with `scope: "sat:refresh"` to enable automatic token refresh.
   *   Ignoring `context.fingerprint` causes the SDK to fall back to `refresh()`
   *   (if provided) or end the session at expiry.
   *
   * SDK behavior:
   * - Awaits this method before establishing the WebSocket connection.
   * - On rejection, propagates the error to the caller of `SignalWire()`.
   */
  authenticate(context?: AuthenticateContext): Promise<SDKCredential>;

  /**
   * Obtains fresh credentials before the current ones expire. Optional.
   *
   * Implementor responsibilities:
   * - Resolve with a new {@link SDKCredential} containing an updated `token` (or `authorizationState`) and `expiry_at`.
   * - Reject (throw) if refresh is not possible — the SDK will stop the refresh schedule.
   *
   * SDK behavior:
   * - Only called when `expiry_at` was set on the previous credential AND the
   *   SAT does not carry `sat:refresh` scope (otherwise the SDK refreshes
   *   internally via Client Bound SAT). See the precedence table above.
   * - Scheduled automatically before expiry; implementors do not need to manage timing.
   * - On rejection, the refresh schedule stops and the session continues with the
   *   current credentials until they expire.
   */
  refresh?: () => Promise<SDKCredential>;
}

/**
 * Provides custom WebRTC API implementations for non-standard environments.
 *
 * Use this when the standard browser WebRTC APIs are not available or need
 * to be replaced (e.g., Citrix HDX, React Native, Electron).
 *
 * @example
 * ```typescript
 * import { SignalWire, type WebRTCApiProvider } from '@signalwire/js';
 *
 * const provider: WebRTCApiProvider = {
 *   RTCPeerConnection: CustomRTCPeerConnection,
 *   mediaDevices: {
 *     getUserMedia: (constraints) => customGetUserMedia(constraints),
 *     enumerateDevices: () => customEnumerateDevices(),
 *     addEventListener: (type, listener) => { ... },
 *     removeEventListener: (type, listener) => { ... },
 *   }
 * };
 *
 * const client = new SignalWire(credentialProvider, { webRTCApiProvider: provider });
 * ```
 */
export interface WebRTCApiProvider {
  /** Custom RTCPeerConnection constructor. */
  RTCPeerConnection: typeof RTCPeerConnection;

  /** Custom media device access. Only the methods used by the SDK are required. */
  mediaDevices: WebRTCMediaDevices;
}

/**
 * Subset of the `MediaDevices` interface actually used by the SDK.
 *
 * Implementations only need to provide these methods — the full browser
 * `MediaDevices` type is intentionally not required so that React Native
 * and other non-browser environments can conform without polyfilling
 * unused APIs.
 */
export interface WebRTCMediaDevices {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
  getDisplayMedia?(options: DisplayMediaStreamOptions): Promise<MediaStream>;
  enumerateDevices(): Promise<MediaDeviceInfo[]>;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
}
