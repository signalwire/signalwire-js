import { DeviceTokenManager, type ActivationResult } from './DeviceTokenManager';
import { Destroyable } from '../behaviors/Destroyable';
import {
  CREDENTIAL_ACTIVATE_TIMEOUT_MS,
  CREDENTIAL_REFRESH_BUFFER_MS,
  CREDENTIAL_REFRESH_MAX_DELAY_MS,
  CREDENTIAL_REFRESH_MAX_RETRIES,
  CREDENTIAL_REFRESH_RETRY_BASE_MS
} from '../core/constants';
import { InvalidCredentialsError, TokenRefreshError } from '../core/errors';
import { getLogger } from '../utils/logger';

import type { ClientSessionManager } from './ClientSessionManager';
import type { CryptoController } from '../controllers/CryptoController';
import type { HTTPRequestController } from '../controllers/HTTPRequestController';
import type { User } from '../core/entities/User';
import type { SDKCredential } from '../core/types/common.types';
import type { SDKWarning } from '../core/types/warnings.types';
import type { CredentialProvider } from '../dependencies/interfaces';

const logger = getLogger();

const defaultDeviceTokenManagerFactory: DeviceTokenManagerFactory = (
  dpopManager,
  http,
  errorHandler,
  getCredential
) => new DeviceTokenManager(dpopManager, http, errorHandler, getCredential);

/**
 * Read/write port for the orchestrator's credential storage. The coordinator
 * never touches `SignalWire`'s internal `_deps.credential` directly — every
 * read/write goes through this interface so the coordinator stays decoupled
 * from the dependency container.
 */
export interface CredentialStore {
  /** Read the current credential. */
  read(): SDKCredential;
  /** Replace the credential entirely (after a developer-provided refresh). */
  write(credential: SDKCredential): void;
  /** Merge a partial update (used when Client Bound SAT replaces only the token). */
  merge(partial: Partial<SDKCredential>): void;
  /** Persist the credential to long-term storage. */
  persist(credential: SDKCredential): void;
}

/**
 * Outbound notification port for the orchestrator. The coordinator emits
 * errors, warnings, and lifecycle events through this interface instead of
 * holding references to `_errors$` / `_warnings$` subjects.
 */
export interface RefreshNotifier {
  /** Emit a fatal error (e.g., refresh retries exhausted). */
  onError(error: Error): void;
  /** Emit a non-fatal warning (e.g., fallback to developer refresh). */
  onWarning(warning: SDKWarning): void;
  /**
   * Hook fired when developer refresh retries exhaust. The orchestrator
   * typically disconnects in response.
   */
  onRefreshExhausted(): void;
}

/**
 * Optional factory for constructing the internal {@link DeviceTokenManager}.
 * Tests use this to inject a stub without typed-cast reflection. Production
 * code leaves it undefined; the coordinator constructs the default manager.
 */
export type DeviceTokenManagerFactory = (
  dpopManager: CryptoController,
  http: HTTPRequestController,
  errorHandler: (error: Error) => void,
  getCredential: () => SDKCredential
) => DeviceTokenManager;

/** Callbacks the coordinator needs from the orchestrator. */
export interface RefreshCoordinatorDeps {
  /** HTTP client used by the internal Client Bound SAT path. */
  http: HTTPRequestController;
  /** Outbound notification port. */
  notifier: RefreshNotifier;
  /** Credential read/write port. */
  store: CredentialStore;
  /** Test seam — override the internal manager. Production leaves undefined. */
  deviceTokenManagerFactory?: DeviceTokenManagerFactory;
}

/**
 * Centralizes credential-refresh ownership across the two competing
 * mechanisms — developer-provided `CredentialProvider.refresh()` and the
 * Client Bound SAT path via {@link DeviceTokenManager}.
 *
 * Maintains the invariant: **at most one refresh mechanism is armed at a
 * time, and at least one is armed whenever the current credential has an
 * `expiry_at`**.
 *
 * Replaces the previous design where refresh state was distributed across
 * `SignalWire` (timer field, scheduler method, activation helper) and
 * `DeviceTokenManager` (reactive pipeline). Centralizing the invariant in
 * one component eliminates the bug class that produced issue #19074.
 *
 * Race-safety:
 * - `_activating` flag prevents overlapping `activate()` calls from racing.
 * - `_activationGeneration` lets late resolutions detect they've been
 *   preempted by a newer activation (e.g., reconnect during in-flight
 *   `obtainToken`).
 */
export class CredentialRefreshCoordinator extends Destroyable {
  private _developerTimerId?: ReturnType<typeof setTimeout>;
  private _deviceTokenManager?: DeviceTokenManager;
  private _activating = false;
  private _activationGeneration = 0;

  constructor(
    dpopManager: CryptoController | undefined,
    private readonly deps: RefreshCoordinatorDeps
  ) {
    super();
    if (dpopManager?.initialized) {
      const factory = deps.deviceTokenManagerFactory ?? defaultDeviceTokenManagerFactory;
      this._deviceTokenManager = factory(
        dpopManager,
        deps.http,
        (error) => deps.notifier.onError(error),
        () => deps.store.read()
      );
    }
  }

  /** True when the Client Bound SAT path is available (DPoP initialized). */
  public get clientBoundSATAvailable(): boolean {
    return this._deviceTokenManager !== undefined;
  }

  /** True when the developer-provided refresh timer is currently armed. */
  public get developerRefreshArmed(): boolean {
    return this._developerTimerId !== undefined;
  }

  /**
   * Arms the developer-provided refresh timer to fire shortly before
   * `expiresAt`. Replaces any previously scheduled developer refresh.
   *
   * Idempotent — multiple calls just reschedule. On retry exhaustion,
   * invokes `deps.onRefreshExhausted` so the orchestrator can disconnect.
   */
  public scheduleDeveloperRefresh(
    provider: CredentialProvider,
    expiresAt: number,
    attempt = 0
  ): void {
    if (this._developerTimerId !== undefined) {
      clearTimeout(this._developerTimerId);
    }

    const refreshInterval =
      attempt === 0
        ? Math.max(expiresAt - Date.now() - CREDENTIAL_REFRESH_BUFFER_MS, 1000)
        : Math.min(
            CREDENTIAL_REFRESH_RETRY_BASE_MS * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5), // equal-jitter
            CREDENTIAL_REFRESH_MAX_DELAY_MS
          );

    this._developerTimerId = setTimeout(async () => {
      try {
        if (!provider.refresh) {
          throw new InvalidCredentialsError('Credential provider does not support refresh');
        }
        const newCredentials = await provider.refresh();
        this.deps.store.write(newCredentials);
        this.deps.store.persist(newCredentials);
        logger.info('[Coordinator] Credentials refreshed successfully.');
        if (newCredentials.expiry_at) {
          this.scheduleDeveloperRefresh(provider, newCredentials.expiry_at, 0);
        }
      } catch (error: unknown) {
        const nextAttempt = attempt + 1;
        logger.error(
          `[Coordinator] Credential refresh failed (attempt ${nextAttempt}/${CREDENTIAL_REFRESH_MAX_RETRIES}):`,
          error
        );
        this.deps.notifier.onError(
          error instanceof Error ? error : new Error(String(error), { cause: error })
        );
        if (nextAttempt < CREDENTIAL_REFRESH_MAX_RETRIES) {
          this.scheduleDeveloperRefresh(provider, expiresAt, nextAttempt);
        } else {
          logger.error('[Coordinator] Credential refresh exhausted all retries. Disconnecting.');
          this.deps.notifier.onError(
            new TokenRefreshError('Credential refresh failed after max retries')
          );
          this.deps.notifier.onRefreshExhausted();
        }
      }
    }, refreshInterval);
  }

  /**
   * Cancels any scheduled developer-provided refresh. Idempotent.
   *
   * @internal Used by the coordinator's own activation flow. External
   * callers should use {@link suspend} for disconnect-time quiescence —
   * `suspend()` also pauses the internal Client Bound SAT pipeline.
   */
  public cancelDeveloperRefresh(): void {
    if (this._developerTimerId !== undefined) {
      clearTimeout(this._developerTimerId);
      this._developerTimerId = undefined;
    }
  }

  /**
   * Suspends both refresh paths — cancels the developer timer and pauses
   * the internal reactive pipeline. Use when the underlying session is
   * being torn down (e.g., {@link SignalWire.disconnect}). The next
   * {@link activate} call re-enables the internal pipeline.
   *
   * The internal manager's cached token survives — see
   * {@link DeviceTokenManager.pause} — so a subsequent reconnect can
   * skip the `/devices/token` exchange entirely.
   */
  public suspend(): void {
    this.cancelDeveloperRefresh();
    this._deviceTokenManager?.pause();
  }

  /**
   * Asks the Client Bound SAT path to take over refresh. If it accepts,
   * the developer-provided timer (if any) is cancelled. If it declines, the
   * developer timer remains armed and a `credential_refresh_fallback`
   * warning is emitted.
   *
   * **Idempotent** — re-entrant calls during an in-flight activation are
   * dropped. Use `_activationGeneration` to detect stale resolutions
   * (e.g., a reconnect-triggered activate() that races with an earlier one).
   */
  public async activate(user: User, session: ClientSessionManager): Promise<void> {
    if (this._activating) {
      logger.debug('[Coordinator] activate() in flight; ignoring re-entrant call');
      return;
    }
    if (!this._deviceTokenManager) {
      // No DPoP — developer refresh (if armed by validateCredentials) is the
      // only available path.
      return;
    }
    // Re-enable the reactive pipeline in case a previous `suspend()` paused it.
    this._deviceTokenManager.resume();
    const generation = ++this._activationGeneration;
    this._activating = true;
    try {
      const result = await this.withActivationTimeout(
        this._deviceTokenManager.activate(user, session, (cred) => this.deps.store.merge(cred))
      );
      // Race-safety: if a newer activate() has bumped the generation while we
      // were awaiting, the result is stale — let the newer activation own
      // the timer state.
      if (generation !== this._activationGeneration) {
        logger.debug('[Coordinator] activate() result discarded (preempted by newer activation)');
        return;
      }
      if (result.activated) {
        this.cancelDeveloperRefresh();
        logger.debug('[Coordinator] Developer refresh disabled — Client Bound SAT owns refresh');
        return;
      }
      logger.warn(
        `[SignalWire] [SW-REFRESH-FALLBACK] Client Bound SAT declined (reason=${result.reason}); using developer-provided refresh handler.`
      );
      this.deps.notifier.onWarning({
        code: 'credential_refresh_fallback',
        source: 'CredentialProvider',
        reason: result.reason,
        message: `Client Bound SAT activation declined (${result.reason}); using developer-provided refresh.`
      });
    } finally {
      this._activating = false;
    }
  }

  public override destroy(): void {
    this.cancelDeveloperRefresh();
    this._deviceTokenManager?.destroy();
    this._deviceTokenManager = undefined;
    super.destroy();
  }

  /**
   * Races the manager's `activate()` against a hard timeout. A wedged HTTP
   * layer (e.g., proxy issues) could otherwise hang the activation
   * indefinitely, leaving the session with no refresh mechanism while the
   * `_activating` guard blocks subsequent retries.
   *
   * On timeout, the manager is paused immediately. The inner `activate()`
   * may still complete in the background and emit to `_currentToken$`,
   * which would normally arm the reactive refresh pipeline; pausing
   * prevents that pipeline from firing while the developer refresh path
   * is the active mechanism — preserving the "at most one mechanism
   * armed" invariant. The next `activate()` call resumes the manager.
   */
  private async withActivationTimeout(inner: Promise<ActivationResult>): Promise<ActivationResult> {
    return new Promise<ActivationResult>((resolve) => {
      const timer = setTimeout(() => {
        // Pause the manager so any late-completing inner mutations cannot
        // arm a competing refresh pipeline.
        this._deviceTokenManager?.pause();
        resolve({ activated: false, reason: 'activation-timeout' });
      }, CREDENTIAL_ACTIVATE_TIMEOUT_MS);
      inner.then(
        (result) => {
          clearTimeout(timer);
          resolve(result);
        },
        (error) => {
          clearTimeout(timer);
          // Manager exceptions surface to errorHandler internally; treat the
          // timeout race winner as a normal decline so the caller falls back
          // to developer refresh.
          this.deps.notifier.onError(error instanceof Error ? error : new Error(String(error)));
          resolve({ activated: false, reason: 'endpoint-failed' });
        }
      );
    });
  }
}
