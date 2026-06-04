import { filter, switchMap, timer } from 'rxjs';

import { Destroyable } from '../behaviors/Destroyable';
import { POST_PARAMS } from '../controllers/HTTPRequestController';
import {
  SAT_REFRESH_SCOPE,
  DEVICE_TOKEN_ENDPOINT,
  DEVICE_REFRESH_ENDPOINT,
  DEVICE_TOKEN_DEFAULT_EXPIRE_IN,
  DEVICE_TOKEN_REFRESH_BUFFER_MS,
  DEVICE_TOKEN_REFRESH_MAX_RETRIES,
  DEVICE_TOKEN_REFRESH_RETRY_BASE_MS
} from '../core/constants';
import { DeviceTokenError, DPoPInitError, TokenRefreshError } from '../core/errors';
import { getLogger } from '../utils/logger';

import type { ClientSessionManager } from './ClientSessionManager';
import type { CryptoController } from '../controllers/CryptoController';
import type { HTTPRequestController } from '../controllers/HTTPRequestController';
import type { User } from '../core/entities/User';
import type { SDKCredential } from '../core/types/common.types';
import type { DeviceTokenResponse } from '../core/types/crypto.types';

const logger = getLogger();

/** Callback to update the credential in the dependency container. */
export type CredentialUpdater = (credential: Partial<SDKCredential>) => void;

/**
 * Reason `activate()` declined to take over refresh duties. Used as
 * diagnostic metadata only — callers must branch on the `activated`
 * boolean, never on the `reason` string.
 */
export type ActivationDeclineReason =
  | 'no-scope'
  | 'no-dpop-support'
  | 'endpoint-failed'
  | 'activation-timeout'
  | 'already-active';

/**
 * Result of `DeviceTokenManager.activate()`. When `activated` is `true`,
 * the manager owns refresh duties and the caller should disarm any
 * developer-provided refresh timer. When `activated` is `false`, the
 * caller must continue (or arm) the developer-provided refresh path.
 */
export type ActivationResult =
  | { activated: true }
  | { activated: false; reason: ActivationDeclineReason };

/**
 * Resolves the token expiry timestamp (epoch seconds) using a 3-tier priority chain:
 * 1. `data.expires_at` — server-provided absolute timestamp
 * 2. `data.expires_in` — server-provided relative lifetime
 * 3. Fallback to `DEVICE_TOKEN_DEFAULT_EXPIRE_IN` with a warning
 */
export function resolveExpiresAt(data: DeviceTokenResponse): number {
  if (data.expires_at) return data.expires_at;
  if (data.expires_in) return Math.floor(Date.now() / 1000) + data.expires_in;

  logger.warn('[DeviceToken] Could not determine token expiry, using default');
  return Math.floor(Date.now() / 1000) + DEVICE_TOKEN_DEFAULT_EXPIRE_IN;
}

/**
 * Resolves the token TTL in seconds from a fresh response.
 * Called at token receive time so `expires_at - now` reflects the original lifetime.
 *
 * 1. `data.expires_in` — server-provided TTL directly
 * 2. `data.expires_at - now` — derive TTL from absolute timestamp
 * 3. Fallback to `DEVICE_TOKEN_DEFAULT_EXPIRE_IN`
 */
export function resolveExpireIn(data: DeviceTokenResponse): number {
  if (data.expires_in) return data.expires_in;
  if (data.expires_at) return Math.max(data.expires_at - Math.floor(Date.now() / 1000), 1);
  return DEVICE_TOKEN_DEFAULT_EXPIRE_IN;
}

/**
 * Manages the Client Bound SAT lifecycle: activation, token exchange,
 * reauthentication, and automatic refresh scheduling.
 *
 * Extends {@link Destroyable} for automatic RxJS subscription and subject cleanup.
 * Uses a reactive pipeline (`BehaviorSubject` + `switchMap(timer())`) instead of
 * raw `setTimeout` for refresh scheduling.
 */
export class DeviceTokenManager extends Destroyable {
  private _currentToken$ = this.createBehaviorSubject<DeviceTokenResponse | null>(null);
  private _refreshInProgress = false;
  private _paused = false;
  private _effectiveExpireIn = DEVICE_TOKEN_DEFAULT_EXPIRE_IN;
  private _session?: ClientSessionManager;
  private _updateCredential?: CredentialUpdater;

  constructor(
    private readonly dpopManager: CryptoController,
    private readonly http: HTTPRequestController,
    private readonly errorHandler: (error: Error) => void,
    private readonly getCredential: () => SDKCredential
  ) {
    super();

    // Reactive refresh pipeline: whenever a new token is emitted, schedule
    // the next refresh using switchMap (auto-cancels previous timer).
    this.subscribeTo(
      this._currentToken$.pipe(
        filter(Boolean),
        switchMap((tokenData) => {
          const expiresAt = resolveExpiresAt(tokenData);
          const refreshIn = Math.max(
            expiresAt * 1000 - Date.now() - DEVICE_TOKEN_REFRESH_BUFFER_MS,
            1000
          );
          logger.debug(`[DeviceToken] Scheduling Client Bound SAT refresh in ${refreshIn}ms`);
          return timer(refreshIn);
        })
      ),
      () => {
        void this.executeRefresh();
      }
    );
  }
  /** Current token TTL in milliseconds. Used to extend cached credential expiry on refresh. */
  public get effectiveExpireIn(): number {
    return this._effectiveExpireIn;
  }

  /**
   * Activates the Client Bound SAT flow when the user's token has
   * `sat:refresh` scope.
   *
   * Returns an {@link ActivationResult} indicating whether the manager
   * took ownership of refresh duties. The caller must use the `activated`
   * boolean to decide whether to keep its own refresh path armed — when
   * `activated` is `false`, the caller is responsible for refresh.
   *
   * Steps on success:
   * 1. Check user's `sat_claims` for `sat:refresh` scope
   * 2. Call `/api/fabric/subscriber/devices/token` with a DPoP proof
   * 3. Reauthenticate the session with the Client Bound SAT + DPoP proof
   * 4. Emit token to trigger the reactive refresh pipeline
   */
  public async activate(
    user: User,
    session: ClientSessionManager,
    updateCredential: CredentialUpdater
  ): Promise<ActivationResult> {
    const { satClaims } = user;
    if (!satClaims?.scope?.includes(SAT_REFRESH_SCOPE)) {
      logger.debug('[DeviceToken] No sat:refresh scope, skipping Client Bound SAT activation');
      return { activated: false, reason: 'no-scope' };
    }

    this._session = session;
    this._updateCredential = updateCredential;

    try {
      // Fast path: if we already have a cached token from a prior activation
      // (e.g., reconnect after a transient drop), skip the `/devices/token`
      // exchange and just reauthenticate the new session with the existing
      // token. Saves a roundtrip and reduces token-endpoint load on every
      // reconnect.
      //
      // Server contract: a Client Bound SAT minted for DPoP key K is
      // accepted by `signalwire.reauthenticate` for any WebSocket session
      // when paired with a fresh RPC proof signed by K. The token's `cnf`
      // claim binds it to K, not to a particular session. If the server
      // ever revokes a token mid-session, reauthenticate will reject
      // loudly and the catch block below falls back to developer refresh.
      const cached = this._currentToken$.value;
      if (cached && this.isTokenFresh(cached)) {
        logger.debug('[DeviceToken] Reusing cached Client Bound SAT — skipping /devices/token');
        const rpcProof = await this.dpopManager.createRpcProof({
          method: 'signalwire.reauthenticate'
        });
        await session.reauthenticate(cached.token, rpcProof, { clientBound: true });
        updateCredential({ token: cached.token });
        return { activated: true };
      }

      const tokenData = await this.obtainToken();

      // Enrich token data with SAT claims expiry when the server response
      // lacks expiry fields (common with JWE tokens that can't be decoded).
      if (!tokenData.expires_at && !tokenData.expires_in && satClaims.expires_at) {
        tokenData.expires_at = satClaims.expires_at;
      }

      // Store the effective TTL so refresh requests use the same lifetime
      this._effectiveExpireIn = resolveExpireIn(tokenData);

      // Reauthenticate with the Client Bound SAT and mark session as client-bound
      const rpcProof = await this.dpopManager.createRpcProof({
        method: 'signalwire.reauthenticate'
      });
      await session.reauthenticate(tokenData.token, rpcProof, { clientBound: true });

      // Update the stored credential, merging with existing fields
      updateCredential({ token: tokenData.token });

      logger.info('[DeviceToken] Client Bound SAT activated successfully');

      // Emit token to trigger reactive refresh pipeline
      this._currentToken$.next(tokenData);
      return { activated: true };
    } catch (error) {
      logger.error('[DeviceToken] Failed to activate Client Bound SAT:', error);
      this.errorHandler(new DPoPInitError(error, 'Failed to activate Client Bound SAT'));

      // Do NOT seed the reactive pipeline with the developer's unbound token —
      // attempting refresh against DEVICE_REFRESH_ENDPOINT would 401-loop because
      // the server never bound that SAT to the DPoP key. Decline ownership so
      // the orchestrator keeps the developer-provided refresh path armed.
      return { activated: false, reason: 'endpoint-failed' };
    }
  }

  /**
   * Returns true when the cached token has enough headroom before expiry to
   * be safely reused on reactivation. The headroom matches the refresh
   * buffer, so a token within the refresh window is treated as stale (the
   * reactive pipeline is about to refresh it anyway).
   */
  private isTokenFresh(token: DeviceTokenResponse): boolean {
    const expiresAt = resolveExpiresAt(token);
    return expiresAt * 1000 - Date.now() > DEVICE_TOKEN_REFRESH_BUFFER_MS;
  }

  /**
   * Obtains a Client Bound SAT from `/api/fabric/subscriber/devices/token`.
   * Returns the full {@link DeviceTokenResponse} including expiry metadata.
   */
  public async obtainToken(): Promise<DeviceTokenResponse> {
    const dpopProof = await this.dpopManager.createHttpProof({
      method: 'POST',
      uri: DEVICE_TOKEN_ENDPOINT
    });

    const response = await this.http.request({
      url: DEVICE_TOKEN_ENDPOINT,
      ...POST_PARAMS,
      body: JSON.stringify({
        dpop_token: dpopProof,
        expire_in: DEVICE_TOKEN_DEFAULT_EXPIRE_IN
      })
    });

    if (!response.ok || !response.body) {
      throw new DeviceTokenError(
        `Failed to obtain device token: ${response.status} ${response.statusText}`
      );
    }

    const data = JSON.parse(response.body) as DeviceTokenResponse;
    if (!data.token) {
      throw new DeviceTokenError('Device token response missing token field');
    }

    return data;
  }

  /**
   * Refreshes the Client Bound SAT via `/api/fabric/subscriber/devices/refresh`.
   *
   * Creates a fresh DPoP proof, calls the refresh endpoint, reauthenticates
   * the WebSocket session, and returns the new token data (scheduling is
   * handled by the reactive pipeline).
   */
  public async refreshToken(
    session: ClientSessionManager,
    currentToken: string,
    updateCredential: CredentialUpdater
  ): Promise<DeviceTokenResponse> {
    logger.debug('[DeviceToken] Refreshing Client Bound SAT');

    const dpopProof = await this.dpopManager.createHttpProof({
      method: 'POST',
      uri: DEVICE_REFRESH_ENDPOINT,
      accessToken: currentToken
    });

    const response = await this.http.request({
      url: DEVICE_REFRESH_ENDPOINT,
      ...POST_PARAMS,
      body: JSON.stringify({
        dpop_token: dpopProof,
        expire_in: this._effectiveExpireIn
      })
    });

    if (!response.ok || !response.body) {
      throw new TokenRefreshError(
        `Failed to refresh device token: ${response.status} ${response.statusText}`
      );
    }

    const data = JSON.parse(response.body) as DeviceTokenResponse;
    if (!data.token) {
      throw new TokenRefreshError('Device token refresh response missing token field');
    }

    // When the refresh response lacks expiry fields (common with JWE tokens),
    // enrich it with the effective TTL from the previous token cycle.
    if (!data.expires_at && !data.expires_in) {
      data.expires_in = this._effectiveExpireIn;
    }

    // Update effective TTL from the refreshed token's actual expiry
    this._effectiveExpireIn = resolveExpireIn(data);

    // Reauthenticate with the refreshed Client Bound SAT
    const rpcProof = await this.dpopManager.createRpcProof({
      method: 'signalwire.reauthenticate'
    });
    await session.reauthenticate(data.token, rpcProof);

    // Update the stored credential with the refreshed token (merge via callback)
    updateCredential({ token: data.token });

    logger.info('[DeviceToken] Client Bound SAT refreshed successfully');

    return data;
  }

  /**
   * Executes a refresh with retry and exponential backoff.
   * On success, emits to `_currentToken$` to schedule the next refresh.
   * On all retries exhausted, emits to `errorHandler`.
   */
  private async executeRefresh(): Promise<void> {
    if (this._paused) {
      logger.debug('[DeviceToken] Manager paused, skipping refresh');
      return;
    }

    if (this._refreshInProgress) {
      logger.debug('[DeviceToken] Refresh already in progress, skipping');
      return;
    }

    const session = this._session;
    const updateCredential = this._updateCredential;
    if (!session || !updateCredential) {
      logger.warn('[DeviceToken] Cannot refresh: session or updateCredential not set');
      return;
    }

    // Skip refresh if the session is not authenticated (e.g., during disconnect).
    // The refresh will be rescheduled when a new token is emitted after reconnect.
    if (!session.authenticated) {
      logger.debug('[DeviceToken] Session not authenticated, deferring refresh');
      return;
    }

    this._refreshInProgress = true;

    try {
      const currentToken = this.getCredential().token;
      if (!currentToken) {
        throw new TokenRefreshError('No current token available for refresh');
      }

      const newTokenData = await this.retryRefresh(session, currentToken, updateCredential);
      this._currentToken$.next(newTokenData);
    } catch (error) {
      logger.error('[DeviceToken] Automatic Client Bound SAT refresh failed:', error);
      this.errorHandler(
        error instanceof TokenRefreshError
          ? error
          : new TokenRefreshError('Automatic token refresh failed', error)
      );
    } finally {
      this._refreshInProgress = false;
    }
  }

  /**
   * Retries `refreshToken()` up to `DEVICE_TOKEN_REFRESH_MAX_RETRIES` times
   * with exponential backoff (1s, 2s, 4s).
   */
  private async retryRefresh(
    session: ClientSessionManager,
    currentToken: string,
    updateCredential: CredentialUpdater
  ): Promise<DeviceTokenResponse> {
    let lastError: unknown;

    for (let attempt = 0; attempt < DEVICE_TOKEN_REFRESH_MAX_RETRIES; attempt++) {
      try {
        return await this.refreshToken(session, currentToken, updateCredential);
      } catch (error) {
        lastError = error;
        if (attempt < DEVICE_TOKEN_REFRESH_MAX_RETRIES - 1) {
          const delay = DEVICE_TOKEN_REFRESH_RETRY_BASE_MS * Math.pow(2, attempt);
          logger.warn(
            `[DeviceToken] Refresh attempt ${attempt + 1} failed, retrying in ${delay}ms`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new TokenRefreshError('All refresh retries exhausted', lastError);
  }

  /**
   * Stops the reactive refresh pipeline from firing. Use when the underlying
   * session is being torn down (e.g., during {@link SignalWire.disconnect})
   * so a scheduled refresh cannot fire against a destroyed session.
   *
   * The manager's state (cached token, effective TTL, subscriptions) is
   * preserved — call {@link resume} to re-enable firing after reconnect.
   */
  public pause(): void {
    this._paused = true;
  }

  /** Re-enables the reactive refresh pipeline after a previous {@link pause}. */
  public resume(): void {
    this._paused = false;
  }

  /** Cleans up the manager, cancelling the reactive pipeline and all subscriptions. */
  public override destroy(): void {
    super.destroy();
  }
}
