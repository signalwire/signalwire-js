/**
 * Non-fatal warning emitted via {@link SignalWire.warnings$ | client.warnings$}.
 *
 * Use to detect SDK behaviors that affect session liveness or developer-facing
 * contracts but do not warrant disconnection. Discriminated by `code`.
 *
 * Existing consumers of `errors$` are NOT notified — `warnings$` is a separate
 * channel so application code can react to warnings without triggering
 * error-handling code paths (e.g., disconnect cascades, user-facing toasts).
 */
export type SDKWarning = CredentialRefreshFallbackWarning | CredentialNoRefreshHandlerWarning;

/**
 * Diagnostic detail for {@link CredentialRefreshFallbackWarning}. Stable
 * values, but treat unknown strings as "fell back for an unspecified cause" —
 * do not branch on this value for control flow. New values may be added in
 * future releases.
 */
export type CredentialRefreshFallbackReason =
  | 'no-scope'
  | 'no-dpop-support'
  | 'endpoint-failed'
  | 'activation-timeout'
  | (string & {});

/**
 * Emitted when the SDK falls back to the developer-provided
 * {@link CredentialProvider.refresh} because the Client Bound SAT path
 * could not take over.
 *
 * Common causes:
 * - The minted SAT lacks `sat:refresh` scope (`reason: 'no-scope'`).
 * - The `/devices/token` exchange failed transiently (`reason: 'endpoint-failed'`).
 *
 * Subscribe to this warning to detect:
 * - SDKs running with plain SATs that rely on developer-managed refresh
 * - Deployments expected to use bound tokens that silently downgraded to bearer
 *   (a security-relevant signal for fleet observability)
 */
export interface CredentialRefreshFallbackWarning {
  code: 'credential_refresh_fallback';
  source: 'CredentialProvider';
  reason: CredentialRefreshFallbackReason;
  message: string;
}

/**
 * Emitted when a credential has an `expiry_at` but the provider supplies no
 * `refresh()` handler. The session will terminate at expiry with no fallback.
 *
 * Implementors who want long-lived sessions must provide a `refresh()` handler
 * or mint tokens with the `sat:refresh` scope (Client Bound SAT path).
 */
export interface CredentialNoRefreshHandlerWarning {
  code: 'credential_no_refresh_handler';
  source: 'CredentialProvider';
  message: string;
  /** Token expiry timestamp (epoch milliseconds). */
  expiresAt: number;
}
